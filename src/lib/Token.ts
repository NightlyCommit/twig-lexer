import {TokenType} from "./TokenType";

export class Token {
    private readonly _type: TokenType;
    private readonly _value: any;
    private readonly _line: number;
    private readonly _column: number;

    /**
     * @constructor
     * @param {TokenType} type The type of the token
     * @param {*} value The value of the token
     * @param {number} line The line where the token is located in the source
     * @param {number} column The column where the token is located in the source
     */
    constructor(type: TokenType, value: any, line: number, column: number) {
        this._type = type;
        this._value = value;
        this._line = line;
        this._column = column;
    }

    /**
     * Test the token for a type and/or a content.
     *
     * @param {TokenType} type
     * @param {string|string[]|number} value
     * @returns {boolean}
     */
    public test(type: TokenType, value: string | string[] | number = null) {
        return (this._type === type) && (value === null || (Array.isArray(value) && value.includes(this._value)) || this._value == value);
    }

    /**
     * Return the line where the token is located in the source.
     *
     * @return {number}
     */
    get line(): number {
        return this._line;
    }

    /**
     * Return the column where the token is located in the source.
     *
     * @return {number}
     */
    get column(): number {
        return this._column;
    }

    /**
     * Return the type of the token.
     *
     * @return {TokenType}
     */
    get type(): TokenType {
        return this._type;
    }

    /**
     * Return the value of the token.
     *
     * @return {*}
     */
    get value(): any {
        return this._value;
    }

    /**
     * Return the human-readable representation of the token.
     *
     * @return {string}
     */
    public toString(): string {
        return `${this.type}(${this.value ? this.value : ''})`;
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