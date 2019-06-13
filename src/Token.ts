export enum TokenType {
    EOF = 'EOF',
    TEXT = 'TEXT',
    BLOCK_START = 'BLOCK_START',
    BLOCK_END = 'BLOCK_END',
    VAR_START = 'VAR_START',
    VAR_END = 'VAR_END',
    NAME = 'NAME',
    NUMBER = 'NUMBER',
    STRING = 'STRING',
    OPERATOR = 'OPERATOR',
    TEST_OPERATOR = 'TEST_OPERATOR',
    PUNCTUATION = 'PUNCTUATION',
    PROPERTY = 'PROPERTY',
    INTERPOLATION_START = 'INTERPOLATION_START',
    INTERPOLATION_END = 'INTERPOLATION_END',
    COMMENT_START = 'COMMENT_START',
    COMMENT_END = 'COMMENT_END',
    WHITESPACE = 'WHITESPACE',
    OPENING_QUOTE = 'OPENING_QUOTE',
    CLOSING_QUOTE = 'CLOSING_QUOTE',
    WHITESPACE_CONTROL_MODIFIER_TRIMMING = 'WHITESPACE_CONTROL_MODIFIER_TRIMMING',
    WHITESPACE_CONTROL_MODIFIER_LINE_TRIMMING = 'WHITESPACE_CONTROL_MODIFIER_LINE_TRIMMING'
}

export class Token {
    readonly type: TokenType;
    readonly tag: string;
    readonly content: string;
    readonly lineno: number;
    readonly columnno: number;

    constructor(type: TokenType, content: string, lineno: number, columnno: number) {
        this.type = type;
        this.content = content;
        this.lineno = lineno;
        this.columnno = columnno;
    }

    /**
     * Returns the constant representation (internal) of a given type.
     *
     * @param {TokenType} type The type
     * @param {boolean} short Whether to return a short representation or not
     *
     * @returns {string} The string representation
     */
    static typeToString(type: TokenType, short: boolean = false) {
        if (TokenType[type]) {
            return short ? type : 'TokenType.' + type;
        }
        else {
            throw new Error(`Token of type "${type}" does not exist.`);
        }
    }

    /**
     * Returns the English representation of a given type.
     *
     * @param {int} type The type as an integer
     *
     * @returns {string} The string representation
     */
    static typeToEnglish(type: string): string {
        switch (type) {
            case TokenType.EOF:
                return 'end of template';
            case TokenType.TEXT:
                return 'text';
            case TokenType.BLOCK_START:
                return 'begin of statement block';
            case TokenType.VAR_START:
                return 'begin of print statement';
            case TokenType.BLOCK_END:
                return 'end of statement block';
            case TokenType.VAR_END:
                return 'end of print statement';
            case TokenType.NAME:
                return 'name';
            case TokenType.NUMBER:
                return 'number';
            case TokenType.STRING:
                return 'string';
            case TokenType.OPERATOR:
                return 'operator';
            case TokenType.TEST_OPERATOR:
                return 'test operator';
            case TokenType.PUNCTUATION:
                return 'punctuation';
            case TokenType.PROPERTY:
                return 'property';
            case TokenType.INTERPOLATION_START:
                return 'begin of string interpolation';
            case TokenType.INTERPOLATION_END:
                return 'end of string interpolation';
            case TokenType.COMMENT_START:
                return 'begin of comment statement';
            case TokenType.COMMENT_END:
                return 'end of comment statement';
            case TokenType.WHITESPACE:
                return 'whitespace';
            case TokenType.OPENING_QUOTE:
                return 'opening quote';
            case TokenType.CLOSING_QUOTE:
                return 'closing quote';
            case TokenType.WHITESPACE_CONTROL_MODIFIER_TRIMMING:
                return 'trimming whitespace control modifier';
            case TokenType.WHITESPACE_CONTROL_MODIFIER_LINE_TRIMMING:
                return 'line trimming whitespace control modifier';
            default:
                throw new Error(`Token of type "${type}" does not exist.`);
        }
    }

    /**
     * Tests the current token for a type and/or a content.
     *
     * @param {TokenType} type
     * @param {string|Array<string>} contents
     * @returns {boolean}
     */
    public test(type: TokenType, contents: Array<string> | string | number = null) {
        return (this.type === type) && (contents === null || (Array.isArray(contents) && contents.includes(this.content)) || this.content == contents);
    }

    /**
     * @return int
     */
    public getLine() {
        return this.lineno;
    }

    /**
     * @return int
     */
    public getColumn() {
        return this.columnno;
    }

    public getType(): TokenType {
        return this.type;
    }

    public getContent() {
        return this.content;
    }

    public toString() {
        return `${Token.typeToString(this.type, true)}(${this.content ? this.content : ''})`;
    }

    /**
     * Serialize the token to a Twig source
     *
     * @return string
     */
    public serialize() {
        return this.content;
    }
}
