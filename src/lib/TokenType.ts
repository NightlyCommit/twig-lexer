export enum TokenType {
    CLOSING_QUOTE = 'CLOSING_QUOTE',
    COMMENT_END = 'COMMENT_END',
    COMMENT_START = 'COMMENT_START',
    EOF = 'EOF',
    INTERPOLATION_START = 'INTERPOLATION_START',
    INTERPOLATION_END = 'INTERPOLATION_END',
    LINE_TRIMMING_MODIFIER = 'LINE_TRIMMING_MODIFIER',
    NAME = 'NAME',
    NUMBER = 'NUMBER',
    OPENING_QUOTE = 'OPENING_QUOTE',
    OPERATOR = 'OPERATOR',
    PUNCTUATION = 'PUNCTUATION',
    STRING = 'STRING',
    TAG_END = 'TAG_END',
    TAG_START = 'TAG_START',
    TEST_OPERATOR = 'TEST_OPERATOR',
    TEXT = 'TEXT',
    TRIMMING_MODIFIER = 'TRIMMING_MODIFIER',
    VARIABLE_END = 'VARIABLE_END',
    VARIABLE_START = 'VARIABLE_START',
    WHITESPACE = 'WHITESPACE'
}

/**
 * Returns the human representation of a token type.
 *
 * @param {TokenType} type The token type
 * @param {boolean} short Whether to return a short representation or not
 *
 * @returns {string} The string representation
 */
export function typeToString(type: TokenType, short: boolean = false): string {
    if (type in TokenType) {
        return short ? type : 'TokenType.' + type;
    } else {
        throw new Error(`Token type "${type}" does not exist.`);
    }
}
