import {TokenType} from "./TokenType";
import {Token} from "./Token";

const safeCChars: Array<string> = ['b', 'f', 'n', 'r', 't', 'v', '0', '\'', '"', '\\'];

const stripcslashes = function (string: string) {
    return string.replace(/\\(.)/g, function (match, char) {
        if (safeCChars.includes(char)) {
            return new Function('return "' + match + '"')();
        } else {
            return char;
        }
    });
};

type TokenVisitor = (token: Token, stream: TokenStream) => Token;

/**
 * Token visitor that returns an AST token relevant to render a Twig template.
 *
 * @param {Token} token
 * @param {TokenStream} stream
 * @return {Token}
 */
export const astVisitor: TokenVisitor = (token: Token, stream: TokenStream): Token => {
    if (!token.test("WHITESPACE") &&
        !token.test("TRIMMING_MODIFIER") &&
        !token.test("LINE_TRIMMING_MODIFIER")) {
        let tokenValue: string = token.value;
        let tokenLine: number = token.line;
        let tokenColumn: number = token.column;

        if (token.test("EOF")) {
            return token;
        }

        if (token.test("NUMBER")) {
            return new Token(token.type, Number(token.value), token.line, token.column);
        }

        if (token.test("OPENING_QUOTE")) {
            let candidate = stream.look(1);

            if (candidate.test("CLOSING_QUOTE")) {
                return new Token("STRING", '', token.line, token.column);
            }
        }

        if (token.test("STRING")) {
            let candidate = stream.look(-1);

            if (candidate && candidate.test("OPENING_QUOTE")) {
                tokenLine = candidate.line;
                tokenColumn = candidate.column;
            }
        }

        if (!token.test("OPENING_QUOTE") && !token.test("CLOSING_QUOTE")) {
            if (token.test("TEXT") || token.test("STRING")) {
                // streamline line separators
                tokenValue = tokenValue.replace(/\r\n|\r/g, '\n');
            } else if (token.test("OPERATOR")) {
                // remove unnecessary operator spaces
                tokenValue = tokenValue.replace(/\s+/, ' ');
            }

            if (token.test("STRING")) {
                // strip C slashes
                tokenValue = stripcslashes(tokenValue);
            }

            // handle whitespace control modifiers
            let wstCandidate: Token;

            wstCandidate = stream.look(2);

            if (wstCandidate) {
                if (wstCandidate.type === "TRIMMING_MODIFIER") {
                    tokenValue = tokenValue.replace(/\s*$/, '');
                }

                if (wstCandidate.type === "LINE_TRIMMING_MODIFIER") {
                    tokenValue = tokenValue.replace(/[ \t\0\x0B]*$/, '');
                }
            }

            wstCandidate = stream.look(-2);

            if (wstCandidate) {
                if (wstCandidate.type === "TRIMMING_MODIFIER") {
                    tokenValue = tokenValue.replace(/^\s*/, '');
                }

                if (wstCandidate.type === "LINE_TRIMMING_MODIFIER") {
                    tokenValue = tokenValue.replace(/^[ \t\0\x0B]*/, '');
                }
            }

            // don't push empty "TEXT" tokens
            if (!token.test("TEXT") || (tokenValue.length > 0)) {
                return new Token(token.type, tokenValue, tokenLine, tokenColumn);
            }
        }
    }
};

export class TokenStream {
    private _tokens: Array<Token>;
    private _current: number = 0;

    constructor(tokens: Array<Token>) {
        this._tokens = tokens;
    }

    /**
     * @return {Token}
     */
    get current(): Token {
        return this._tokens[this._current];
    }

    /**
     * @return {Token[]}
     */
    get tokens(): Token[] {
        return this._tokens;
    }

    toString() {
        return this.tokens.map(function (token: Token) {
            return token.toString();
        }).join('\n');
    }

    /**
     * Construct and return a list of tokens relevant to render a Twig template.
     *
     * @return {Token[]}
     */
    toAst(): Token[] {
        return this.traverse(astVisitor);
    }

    /**
     * Serialize the stream to a Twig string.
     *
     * @return {string}
     */
    serialize() {
        return this.tokens.map(function (token: Token) {
            return token.serialize();
        }).join('');
    }

    /**
     * Traverse the stream using a visitor.
     *
     * @param {TokenVisitor} visitor
     * @return {Token[]}
     */
    traverse(visitor: TokenVisitor): Token[] {
        let tokens: Token[] = [];

        do {
            let token = visitor(this.current, this);

            if (token) {
                tokens.push(token);
            }

        } while (this.next());

        return tokens;
    }

    /**
     * Inject tokens after the current one.
     *
     * @param tokens
     */
    injectTokens(tokens: Token[]) {
        this._tokens.splice(this._current, 0, ...tokens);
    }

    rewind() {
        this._current = 0;
    }

    /**
     * Set the pointer to the next token and returns the previous one.
     *
     * @return {Token}
     */
    next() {
        let token = this.current;

        this._current++;

        if (this._current >= this.tokens.length) {
            return null;
        }

        return token;
    }

    /**
     * Test the current token, then, if the test is successful, sets the pointer to the next one and returns the tested token.
     *
     * @return {Token} The next token if the condition is true, null otherwise
     */
    nextIf(primary: TokenType, secondary: Array<string> | string = null): Token {
        if (this.current.test(primary, secondary)) {
            return this.next();
        }

        return null;
    }

    /**
     * Look at the next token.
     *
     * @param {number} number
     *
     * @return {Token}
     */
    look(number: number = 1) {
        let index = this._current + number;

        if ((index >= this.tokens.length) || (index < 0)) {
            return null;
        }

        return this.tokens[index];
    }

    /**
     * Test the current token.
     *
     * @param {TokenType} type
     * @param {string|string[]|number} value
     * @returns {boolean}
     */
    test(type: TokenType, value: string | string[] | number = null) {
        return this.current.test(type, value);
    }
}