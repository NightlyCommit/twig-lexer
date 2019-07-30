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
     * Construct and return a list of tokens relevant to render a Twig template.
     *
     * @return {Token[]}
     */
    toAst(): Token[] {
        let tokens: Token[] = [];

        while (!this.test(TokenType.EOF)) {
            let current: Token = this.current;

            if (!this.test(TokenType.WHITESPACE) &&
                !this.test(TokenType.TRIMMING_MODIFIER) &&
                !this.test(TokenType.LINE_TRIMMING_MODIFIER)) {
                let tokenValue: string = current.value;

                if (this.test(TokenType.TEXT) || this.test(TokenType.STRING)) {
                    // strip C slashes
                    tokenValue = stripcslashes(tokenValue);
                    // streamline line separators
                    tokenValue = tokenValue.replace(/\r\n|\r/g, '\n');
                } else if (this.test(TokenType.OPERATOR)) {
                    // remove unnecessary operator spaces
                    tokenValue = tokenValue.replace(/\s+/, ' ');
                }

                // handle whitespace control modifiers
                let wstCandidate: Token;

                wstCandidate = this.look(2);

                if (wstCandidate) {
                    if (wstCandidate.type === TokenType.TRIMMING_MODIFIER) {
                        tokenValue = tokenValue.replace(/\s*$/, '');
                    }

                    if (wstCandidate.type === TokenType.LINE_TRIMMING_MODIFIER) {
                        tokenValue = tokenValue.replace(/[ \t\0\x0B]*$/, '');
                    }
                }

                wstCandidate = this.look(-2);

                if (wstCandidate) {
                    if (wstCandidate.type === TokenType.TRIMMING_MODIFIER) {
                        tokenValue = tokenValue.replace(/^\s*/, '');
                    }

                    if (wstCandidate.type === TokenType.LINE_TRIMMING_MODIFIER) {
                        tokenValue = tokenValue.replace(/^[ \t\0\x0B]*/, '');
                    }
                }

                // don't push empty TEXT tokens
                if (!this.test(TokenType.TEXT) || (tokenValue.length > 0)) {
                    tokens.push(new Token(current.type, tokenValue, current.line, current.column));
                }
            }

            this.next();
        }

        // EOF
        let current: Token = this.current;

        tokens.push(new Token(
            current.type,
            current.value,
            current.line,
            current.column
        ));

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