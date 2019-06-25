import {TokenType, typeToString} from "./TokenType";

export class Token {
    private type: TokenType;
    private value: any;
    private line: number;
    private column: number;

    /**
     * @constructor
     * @param {TokenType} type The type of the token
     * @param {*} value The value of the token
     * @param {number} line The line where the token is located in the source
     * @param {number} column The column where the token is located in the source
     */
    constructor(type: TokenType, value: any, line: number, column: number) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }

    /**
     * Tests the current token for a type and/or a content.
     *
     * @param {TokenType} type
     * @param {string|string[]|number} values
     * @returns {boolean}
     */
    public test(type: TokenType, values: string | string[] | number = null) {
        return (this.type === type) && (values === null || (Array.isArray(values) && values.includes(this.value)) || this.value == values);
    }

    /**
     * Return the line where the token is located in the source.
     *
     * @return {number}
     */
    public getLine(): number {
        return this.line;
    }

    /**
     * Return the column where the token is located in the source.
     *
     * @return {number}
     */
    public getColumn(): number {
        return this.column;
    }

    /**
     * Return the type of the token.
     *
     * @return {TokenType}
     */
    public getType(): TokenType {
        return this.type;
    }

    /**
     * Return the value of the token.
     *
     * @return {*}
     */
    public getValue(): any {
        return this.value;
    }

    /**
     * Return the human-readable representation of the token.
     *
     * @return {string}
     */
    public toString(): string {
        return `${typeToString(this.type, true)}(${this.value ? this.value : ''})`;
    }

    /**
     * Serialize the token to a Twig source.
     *
     * @return {string}
     */
    public serialize(): string {
        return this.value;
    }
}
