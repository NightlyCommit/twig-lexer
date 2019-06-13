import {Token, TokenType} from "./Token";
import {TokenStream} from "./TokenStream";
import {SyntaxError} from "./SyntaxError";

let preg_quote = require('locutus/php/pcre/preg_quote');
let ctype_alpha = require('locutus/php/ctype/ctype_alpha');
let merge = require('merge');

enum LexerState {
    DATA = 'DATA',
    BLOCK = 'BLOCK',
    VAR = 'VAR',
    STRING = 'STRING',
    INTERPOLATION = 'INTERPOLATION'
}

export class Lexer {
    static STATE_DATA = 0;
    static STATE_BLOCK = 1;
    static STATE_VAR = 2;
    static STATE_STRING = 3;
    static STATE_INTERPOLATION = 4;
    static STATE_PROPERTY_ACCESS = 5;

    static REGEX_TEST_OPERATOR = /^(is\s+not|is)/;
    static REGEX_ASSIGNMENT_OPERATOR = /^=/;
    static REGEX_NAME = /^[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/;
    static REGEX_NUMBER = /^[0-9]+(?:\.[0-9]+)?/;
    static REGEX_STRING = /^(")([^#"\\]*(?:\\.[^#"\\]*)*)(")|^(')([^'\\]*(?:\\.[^'\\]*)*)(')/;
    static REGEX_DQ_STRING_DELIM = /^"/;
    static REGEX_DQ_STRING_PART = /^[^#"\\]*(?:(?:\\\\.|#(?!{))[^#"\\]*)*/;
    static PUNCTUATION = '()[]{}?:.,|';
    static LINE_SEPARATORS = ['\\r\\n', '\\r', '\\n'];

    static PROPERTY_ACCESSORS = ['.', '['];

    private brackets: Array<{ value: string, line: number }>;
    private code: string;
    private currentVarBlockLine: number;
    private currentBlockName: string;
    private cursor: number;
    private end: number;
    private lineno: number; // 1-based
    private columnno: number; // 1-based
    private options: {
        interpolation: Array<string>,
        tag_block: Array<string>,
        tag_comment: Array<string>,
        tag_variable: Array<string>,
        whitespace_trim: string,
        line_whitespace_trim: string
    };
    private operators: string[];
    private position: number;
    private positions: Array<RegExpExecArray>;
    private regexes: {
        interpolation_end: RegExp,
        interpolation_start: RegExp,
        lex_block: RegExp,
        lex_block_raw: RegExp,
        lex_comment: RegExp,
        lex_raw_data: RegExp,
        lex_tokens_start: RegExp,
        lex_var: RegExp,
        operator: RegExp,
        whitespace: RegExp
    };
    private source: string;
    private state: number;
    private states: Array<number>;
    private tokens: Array<Token>;
    private lastStructuringToken: Token;

    constructor(options: {} = {}) {
        this.operators = [
            // todo: list operators
        ];

        this.options = merge({
            interpolation: ['#{', '}'],
            tag_block: ['{%', '%}'],
            tag_comment: ['{#', '#}'],
            tag_variable: ['{{', '}}'],
            whitespace_trim: '-',
            line_whitespace_trim: '~',
        }, options);

        this.regexes = {
            interpolation_start: new RegExp('^(' + this.options.interpolation[0] + ')(\\s*)'),
            interpolation_end: new RegExp('^(\\s*)(' + this.options.interpolation[1] + ')'),
            lex_block: new RegExp(
                '^(' + this.options.whitespace_trim + '?)(' + this.options.tag_block[1] + '(?:' + Lexer.LINE_SEPARATORS.join('|') + ')?)'
            ),
            lex_block_raw: new RegExp(
                '^(\\s*)(verbatim)(\\s*)(' + this.options.whitespace_trim + '?)(' + this.options.tag_block[1] + ')'
            ),
            lex_comment: new RegExp(
                '(\\s*)(' + this.options.whitespace_trim + '?)(' + this.options.tag_comment[1] + '(?:' + Lexer.LINE_SEPARATORS.join('|') + ')?)'
            ),
            lex_raw_data: new RegExp(
                '(' + this.options.tag_block[0] + ')(' + this.options.whitespace_trim + '?)' +
                '(\\s*)(endverbatim)(\\s*)' +
                '(' + this.options.whitespace_trim + '?)(' + this.options.tag_block[1] + ')'
            ),
            lex_tokens_start: new RegExp('(' +
                this.options.tag_variable[0] + '|' +
                this.options.tag_block[0] + '|' +
                this.options.tag_comment[0] + ')(' +
                this.options.whitespace_trim + ')?', 'g'
            ),
            lex_var: new RegExp('^(' + this.options.whitespace_trim + '?)(' + this.options.tag_variable[1] + ')'),
            operator: this.getOperatorRegEx(),
            whitespace: new RegExp('^\\s+')
        };
    }

    public tokenize(source: string): TokenStream {
        this.source = source;

        if (typeof source !== 'string') {
            this.code = '';
        } else {
            this.code = source;
        }

        this.cursor = 0;
        this.end = this.code.length;
        this.lineno = 1;
        this.columnno = 1;
        this.tokens = [];
        this.state = Lexer.STATE_DATA;
        this.states = [];
        this.brackets = [];
        this.position = -1;
        this.positions = [];

        // find all token starts in one go
        let match: RegExpExecArray;

        while ((match = this.regexes.lex_tokens_start.exec(this.code)) !== null) {
            this.positions.push(match);
        }

        while (this.cursor < this.end) {
            // dispatch to the lexing functions depending on the current state
            switch (this.state) {
                case Lexer.STATE_DATA:
                    this.lexData();
                    break;
                case Lexer.STATE_BLOCK:
                    this.lexBlock();
                    break;
                case Lexer.STATE_VAR:
                    this.lexVar();
                    break;
                case Lexer.STATE_STRING:
                    this.lexString();
                    break;
                case Lexer.STATE_INTERPOLATION:
                    this.lexInterpolation();
                    break;
            }
        }

        this.pushToken(TokenType.EOF, null);

        if (this.brackets.length > 0) {
            let bracket = this.brackets.pop();

            let expect = bracket.value;
            let lineno = bracket.line;

            throw new SyntaxError(`Unclosed "${expect}".`, lineno, -1);
        }

        return new TokenStream(this.tokens, this.source);
    }

    protected lexData() {
        // if no matches are left we return the rest of the template as simple text token
        if (this.position === (this.positions.length - 1)) {
            let text = this.code.substring(this.cursor);

            this.pushToken(TokenType.TEXT, text);
            this.moveCursor(text);

            return;
        }

        // Find the first token after the current cursor
        let position: RegExpExecArray = this.positions[++this.position];

        while (position.index < this.cursor) {
            if (this.position == (this.positions.length - 1)) {
                return;
            }

            position = this.positions[++this.position];
        }

        // push the template text first
        let text: string = this.code.substr(this.cursor, position.index - this.cursor);

        this.pushToken(TokenType.TEXT, text);
        this.moveCursor(text);

        let tag = position[1];
        let modifier = position[2];

        this.moveCursor(tag + (modifier ? modifier : ''));

        switch (tag) {
            case this.options.tag_comment[0]:
                this.pushToken(TokenType.COMMENT_START, tag);
                this.pushWhitespaceTrimToken(modifier);
                this.lexComment();
                break;
            case this.options.tag_block[0]:
                // raw data?
                let match: RegExpExecArray;

                if ((match = this.regexes.lex_block_raw.exec(this.code.substring(this.cursor))) !== null) {
                    this.pushToken(TokenType.BLOCK_START, tag);
                    this.pushWhitespaceTrimToken(modifier);
                    this.pushToken(TokenType.WHITESPACE, match[1]);
                    this.pushToken(TokenType.NAME, match[2]); // verbatim itself
                    this.pushToken(TokenType.WHITESPACE, match[3]);
                    this.pushWhitespaceTrimToken(match[4]);
                    this.pushToken(TokenType.BLOCK_END, match[5]);

                    this.moveCursor(match[0]);
                    this.lexVerbatim();
                } else {
                    this.pushToken(TokenType.BLOCK_START, tag);
                    this.pushWhitespaceTrimToken(modifier);
                    this.pushState(Lexer.STATE_BLOCK);
                    this.currentVarBlockLine = this.lineno;
                }
                break;
            case this.options.tag_variable[0]:
                this.pushToken(TokenType.VAR_START, tag);
                this.pushWhitespaceTrimToken(modifier);
                this.pushState(Lexer.STATE_VAR);
                this.currentVarBlockLine = this.lineno;
                break;
        }
    }

    protected lexBlock() {
        this.lexWhitespace();

        let code: string = this.code.substring(this.cursor);
        let match: RegExpExecArray;

        if ((this.brackets.length < 1) && ((match = this.regexes.lex_block.exec(code)) !== null)) {
            let tag = match[2];
            let modifier = match[1];

            this.pushWhitespaceTrimToken(modifier);
            this.pushToken(TokenType.BLOCK_END, tag);
            this.moveCursor(tag + (modifier ? modifier : ''));

            this.popState();
        } else {
            this.lexExpression();
        }
    }

    protected lexVar() {
        this.lexWhitespace();

        let match: RegExpExecArray;

        if ((this.brackets.length < 1) && ((match = this.regexes.lex_var.exec(this.code.substring(this.cursor))) !== null)) {
            this.pushWhitespaceTrimToken(match[1]);
            this.pushToken(TokenType.VAR_END, match[2]);
            this.moveCursor(match[0]);
            this.popState();
        } else {
            this.lexExpression();
        }
    }

    protected lexWhitespace() {
        let match: RegExpExecArray;
        let candidate: string = this.code.substring(this.cursor);

        // whitespace
        if ((match = this.regexes.whitespace.exec(candidate)) !== null) {
            let content = match[0];

            this.pushToken(TokenType.WHITESPACE, content);
            this.moveCursor(content);

            if (this.cursor >= this.end) {
                throw new SyntaxError(`Unclosed "${this.state === Lexer.STATE_BLOCK ? 'block' : 'variable'}".`, this.currentVarBlockLine, -1);
            }
        }
    }

    protected lexExpression() {
        this.lexWhitespace();

        let match: RegExpExecArray;
        let candidate: string = this.code.substring(this.cursor);
        let punctuationCandidate: string;

        punctuationCandidate = candidate.substr(0, 1);

        // test operator
        if ((match = Lexer.REGEX_TEST_OPERATOR.exec(candidate)) !== null) {
            if (this.testTokenType(TokenType.PROPERTY)) {
                this.pushToken(TokenType.PROPERTY, match[0]);
            }
            else {
                this.pushToken(TokenType.TEST_OPERATOR, match[0]);
            }

            this.moveCursor(match[0]);
        }
        // operators
        else if ((match = this.regexes.operator.exec(candidate)) !== null) {
            this.pushToken(TokenType.OPERATOR, match[0]);
            this.moveCursor(match[0]);
        }
        // names
        else if ((match = Lexer.REGEX_NAME.exec(candidate)) !== null) {
            let content = match[0];

            if (this.state === Lexer.STATE_BLOCK) {
                this.currentBlockName = content;
            }

            if (this.testTokenType(TokenType.PROPERTY)) {
                this.pushToken(TokenType.PROPERTY, content);
            }
            else {
                this.pushToken(TokenType.NAME, content);
            }

            this.moveCursor(content);
        }
        // numbers
        else if ((match = Lexer.REGEX_NUMBER.exec(candidate)) !== null) {
            if (this.testTokenType(TokenType.PROPERTY)) {
                this.pushToken(TokenType.PROPERTY, match[0]);
            }
            else {
                this.pushToken(TokenType.NAME, match[0]);
            }

            this.moveCursor(match[0]);
        }
        // punctuation
        else if (Lexer.PUNCTUATION.indexOf(punctuationCandidate) > -1) {
            // opening bracket
            if ('([{'.indexOf(punctuationCandidate) > -1) {
                this.brackets.push({
                    value: punctuationCandidate,
                    line: this.lineno
                });
            }
            // closing bracket
            else if (')]}'.indexOf(punctuationCandidate) > -1) {
                if (this.brackets.length < 1) {
                    throw new SyntaxError(`Unexpected "${punctuationCandidate}".`, this.lineno, -1);
                }

                let bracket = this.brackets.pop();

                let lineno = bracket.line;

                let expect = bracket.value
                    .replace('(', ')')
                    .replace('[', ']')
                    .replace('{', '}')
                ;

                if (punctuationCandidate != expect) {
                    throw new SyntaxError(`Unclosed "${expect}".`, lineno, -1);
                }
            }

            this.pushToken(TokenType.PUNCTUATION, punctuationCandidate);

            this.moveCursor(punctuationCandidate);
        }
        // strings
        else if ((match = Lexer.REGEX_STRING.exec(candidate)) !== null) {
            let openingBracket = match[1] || match[4];
            let content = match[2] || match[5];
            let closingBracket = match[3] || match[6];

            this.pushToken(TokenType.OPENING_QUOTE, openingBracket);
            this.moveCursor(openingBracket);

            if (content !== undefined) {
                this.pushToken(TokenType.STRING, content);
                this.moveCursor(content);
            }

            this.pushToken(TokenType.CLOSING_QUOTE, closingBracket);
            this.moveCursor(closingBracket);
        }
        // opening double quoted string
        else if ((match = Lexer.REGEX_DQ_STRING_DELIM.exec(candidate)) !== null) {
            this.brackets.push({
                value: match[0],
                line: this.lineno
            });

            this.pushToken(TokenType.OPENING_QUOTE, match[0]);
            this.pushState(Lexer.STATE_STRING);
            this.moveCursor(match[0]);
        }
        // unlexable
        else {
            throw new SyntaxError(`Unexpected character "${candidate}" in "${this.code}".`, this.lineno, -1);
        }
    }

    protected lexVerbatim() {
        let match: RegExpExecArray = this.regexes.lex_raw_data.exec(this.code.substring(this.cursor));

        if (!match) {
            throw new SyntaxError('Unexpected end of file: unclosed "verbatim" block.', this.lineno, -1);
        }

        let text = this.code.substr(this.cursor, match.index);

        this.pushToken(TokenType.TEXT, text);

        this.pushToken(TokenType.BLOCK_START, match[1]);
        this.pushWhitespaceTrimToken(match[2]);
        this.pushToken(TokenType.WHITESPACE, match[3]);
        this.pushToken(TokenType.NAME, match[4]); // endverbatim itself
        this.pushToken(TokenType.WHITESPACE, match[5]);
        this.pushWhitespaceTrimToken(match[6]);
        this.pushToken(TokenType.BLOCK_END, match[7]);

        this.moveCursor(text + match[0]);
    }

    protected lexComment() {
        this.lexWhitespace();

        let match = this.regexes.lex_comment.exec(this.code.substring(this.cursor));

        if (!match) {
            throw new SyntaxError('Unclosed comment.', this.lineno, -1);
        }

        let text = this.code.substr(this.cursor, match.index);

        this.pushToken(TokenType.TEXT, text);
        this.moveCursor(text);

        this.lexWhitespace();

        this.pushWhitespaceTrimToken(match[2]);

        this.pushToken(TokenType.COMMENT_END, match[3]);
        this.moveCursor(match[3]);
    }

    protected lexString() {
        let match: RegExpExecArray;

        if ((match = this.regexes.interpolation_start.exec(this.code.substring(this.cursor))) !== null) {
            let tag = match[1];
            let whitespace = match[2];

            this.brackets.push({
                value: tag,
                line: this.lineno
            });

            this.pushToken(TokenType.INTERPOLATION_START, tag);
            this.pushToken(TokenType.WHITESPACE, whitespace);
            this.moveCursor(tag + (whitespace ? whitespace : ''));
            this.pushState(Lexer.STATE_INTERPOLATION);
        } else if (((match = Lexer.REGEX_DQ_STRING_PART.exec(this.code.substring(this.cursor))) !== null) && (match[0].length > 0)) {
            if (match[0] !== undefined) {
                this.pushToken(TokenType.STRING, match[0]);
                this.moveCursor(match[0]);
            }
        } else {
            let content = this.brackets.pop().value;

            this.pushToken(TokenType.CLOSING_QUOTE, content);
            this.moveCursor(content);
            this.popState();
        }
    }

    protected lexInterpolation() {
        let match: RegExpExecArray;
        let bracket = this.brackets[this.brackets.length - 1];

        if (this.options.interpolation[0] === bracket.value && (match = this.regexes.interpolation_end.exec(this.code.substring(this.cursor))) !== null) {
            let tag = match[2];
            let whitespace = match[1] || '';

            this.brackets.pop();

            this.pushToken(TokenType.WHITESPACE, whitespace);
            this.pushToken(TokenType.INTERPOLATION_END, tag);
            this.moveCursor(tag + whitespace);
            this.popState();
        } else {
            this.lexExpression();
        }
    }

    protected moveCursor(text: string) {
        this.cursor += text.length;
    }

    protected moveCoordinates(text: string) {
        this.columnno += text.length;

        let lines = text.split(/\r\n|\r|\n/);

        let lineCount = lines.length - 1;

        if (lineCount > 0) {
            this.lineno += lineCount;
            this.columnno = 1 + lines[lineCount].length;
        }
    }

    protected getOperatorRegEx() {
        let operators = Array.from([
            '=',
            this.operators
        ]);

        operators.sort(function (a, b) {
            return a.length > b.length ? -1 : 1;
        });

        let patterns: Array<string> = [];

        operators.forEach(function (operator) {
            let length: number = operator.length;
            let pattern: string;

            // an operator that ends with a character must be followed by
            // a whitespace or a parenthesis
            if (ctype_alpha(operator[length - 1])) {
                pattern = preg_quote(operator, '/') + '(?=[\\s()])';
            } else {
                pattern = preg_quote(operator, '/');
            }

            // an operator with a space can be any amount of whitespaces
            pattern = pattern.replace(/\s+/, '\\s+');

            patterns.push('^' + pattern);
        });

        return new RegExp(patterns.join('|'));
    };

    protected pushToken(type: TokenType, content: any) {
        if ((type === TokenType.TEXT || type === TokenType.WHITESPACE) && (content.length < 1)) {
            return;
        }

        let token = new Token(type, content, this.lineno, this.columnno);

        this.tokens.push(token);

        if (content) {
            this.moveCoordinates(content);
        }

        switch (token.getType()) {
            case TokenType.WHITESPACE:
            case TokenType.WHITESPACE_CONTROL_MODIFIER_TRIMMING:
            case TokenType.WHITESPACE_CONTROL_MODIFIER_LINE_TRIMMING:
                break;
            default:
                this.lastStructuringToken = token;
        }

        console.warn('LAST STRUCTIRING TOKEN TYPE', this.lastStructuringToken);
    }

    protected pushWhitespaceTrimToken(modifier: string) {
        if (modifier) {
            let type: TokenType;

            if (modifier === this.options.whitespace_trim) {
                type = TokenType.WHITESPACE_CONTROL_MODIFIER_TRIMMING;
            }
            /** else {
                type = TokenType.WHITESPACE_CONTROL_MODIFIER_LINE_TRIMMING;
            } **/

            this.tokens.push(new Token(type, modifier, this.lineno, this.columnno));
            this.moveCoordinates(modifier);
        }
    }

    protected pushState(state: number) {
        this.states.push(this.state);
        this.state = state;
    }

    /**
     * @return TwingLexerState
     */
    protected popState() {
        this.state = this.states.pop();
    }

    /**
     * Test that the token type is valid in the context of the current lexer state.
     *
     * @param {TokenType} type
     *
     * @return boolean
     */
    protected testTokenType(type: TokenType) {
        let result: boolean = false;

        let lastStructuringTokenType = this.lastStructuringToken.getType();
        let lastStructuringTokenContent = this.lastStructuringToken.getContent();

        switch (type) {
            /**
             * Property is valid if they are following a property accessor
             */
            case TokenType.PROPERTY:
                result = lastStructuringTokenType === TokenType.PUNCTUATION && Lexer.PROPERTY_ACCESSORS.includes(lastStructuringTokenContent);
                break;
        }

        return result;
    }
}
