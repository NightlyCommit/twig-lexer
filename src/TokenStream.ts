import {Token, TokenType} from "./Token";
import {SyntaxError} from "./SyntaxError";

const array_merge = require('locutus/php/array/array_merge');

export class TokenStream {
    private tokens: Array<Token>;
    private current: number = 0;
    private source: string;

    constructor(tokens: Array<Token>, source: string = null) {
        this.tokens = tokens;
        this.source = source;
    }

    public toString() {
        return this.tokens.map(function (token: Token) {
            return token.toString();
        }).join('\n');
    }

    /**
     * Serialize the stream to a Twig source.
     *
     * @return string
     */
    public serialize() {
        return this.tokens.map(function (token: Token) {
            return token.serialize();
        }).join('');
    }

    /**
     * Inject tokens after the current one.
     *
     * @param tokens
     */
    public injectTokens(tokens: Array<Token>) {
        this.tokens = array_merge(this.tokens.slice(0, this.current), tokens, this.tokens.slice(this.current));
    }

    public rewind() {
        this.current = 0;
    }

    /**
     * Sets the pointer to the next token and returns the old one.
     *
     * @return Token
     */
    public next() {
        this.current++;

        if (this.current >= this.tokens.length) {
            throw new SyntaxError('Unexpected end of template.', this.tokens[this.current - 1].getLine(), this.tokens[this.current - 1].getColumn());
        }

        return this.tokens[this.current - 1];
    }

    /**
     * Tests a token, sets the pointer to the next one and returns it.
     *
     * @return Token|null The next token if the condition is true, null otherwise
     */
    public nextIf(primary: TokenType, secondary: Array<string> | string = null) {
        if (this.tokens[this.current].test(primary, secondary)) {
            return this.next();
        }

        return null;
    }

    /**
     * Tests a token and returns it or throws a syntax error.
     *
     * @return Token
     */
    public expect(type: TokenType, content: Array<string> | string | number = null, message: string = null) {
        let token = this.tokens[this.current];

        if (!token.test(type, content)) {
            let line = token.getLine();
            let column = token.getColumn();

            throw new SyntaxError(
                `${message ? message + '. ' : ''}Unexpected token "${Token.typeToEnglish(token.getType())}" of value "${token.getContent()}" ("${Token.typeToEnglish(type)}" expected${content ? ` with value "${content}"` : ''}).`,
                line,
                column
            );
        }

        this.next();

        return token;
    }

    /**
     * Looks at the next token.
     *
     * @param {number} number
     * @param {boolean} throw_
     *
     * @return Token
     */
    public look(number: number = 1, throw_: boolean = true) {
        let index = this.current + number;

        if (index >= this.tokens.length) {
            if (throw_) {
                throw new SyntaxError('Unexpected end of template.', this.tokens[this.current + number - 1].getLine(), this.tokens[this.current + number - 1].getColumn());
            }
        }

        return this.tokens[index];
    }

    /**
     * Tests the active token.
     *
     * @return bool
     */
    public test(primary: TokenType, secondary: Array<string> | string = null) {
        return this.tokens[this.current].test(primary, secondary);
    }

    /**
     * Checks if end of stream was reached.
     *
     * @return bool
     */
    public isEOF() {
        return this.tokens[this.current].getType() === TokenType.EOF;
    }

    /**
     * @return Token
     */
    public getCurrent() {
        return this.tokens[this.current];
    }

    /**
     * Gets the source associated with this stream.
     *
     * @return string
     */
    public getSource() {
        return this.source;
    }

    /**
     * @return Token[]
     */
    public getTokens(): Token[] {
        return this.tokens;
    }
}
