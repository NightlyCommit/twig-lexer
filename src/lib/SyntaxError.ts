/**
 * @class
 */
export class SyntaxError extends Error {
    /**
     * The line where the error occurred.
     */
    readonly line: number;

    /**
     * The column where the error occurred.
     */
    readonly column: number;

    /**
     * @constructor
     * @param {string} message The error message
     * @param {number} line The line where the error occurred
     * @param {number} column The column where the error occurred
     */
    constructor(message: string, line: number, column: number) {
        super(message);

        this.name = 'SyntaxError';

        this.line = line;
        this.column = column;
    }
}