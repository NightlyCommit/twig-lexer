export class SyntaxError extends Error {
    private _line: number;
    private _column: number;

    constructor(message: string, line: number, column: number) {
        super(message);

        this._line = line;
        this._column = column;
    }

    get line(): number {
        return this._line;
    }

    get column(): number {
        return this._column;
    }
}