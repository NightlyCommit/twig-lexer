import * as tape from 'tape';
import {TokenType, typeToString} from '../../../../src/lib/TokenType';

tape('TokenType', (test) => {
    test.test('typeToString', (test) => {
        test.same(typeToString(TokenType.TAG_END), 'TokenType.TAG_END');
        test.same(typeToString(TokenType.TAG_START), 'TokenType.TAG_START');
        test.same(typeToString(TokenType.EOF), 'TokenType.EOF');
        test.same(typeToString(TokenType.INTERPOLATION_END), 'TokenType.INTERPOLATION_END');
        test.same(typeToString(TokenType.INTERPOLATION_START), 'TokenType.INTERPOLATION_START');
        test.same(typeToString(TokenType.NAME), 'TokenType.NAME');
        test.same(typeToString(TokenType.NUMBER), 'TokenType.NUMBER');
        test.same(typeToString(TokenType.OPERATOR), 'TokenType.OPERATOR');
        test.same(typeToString(TokenType.PUNCTUATION), 'TokenType.PUNCTUATION');
        test.same(typeToString(TokenType.STRING), 'TokenType.STRING');
        test.same(typeToString(TokenType.TEXT), 'TokenType.TEXT');
        test.same(typeToString(TokenType.VARIABLE_END), 'TokenType.VARIABLE_END');
        test.same(typeToString(TokenType.VARIABLE_START), 'TokenType.VARIABLE_START');
        test.same(typeToString(TokenType.WHITESPACE), 'TokenType.WHITESPACE');
        test.same(typeToString(TokenType.CLOSING_QUOTE), 'TokenType.CLOSING_QUOTE');
        test.same(typeToString(TokenType.OPENING_QUOTE), 'TokenType.OPENING_QUOTE');
        test.same(typeToString(TokenType.TRIMMING_MODIFIER), 'TokenType.TRIMMING_MODIFIER');
        test.same(typeToString(TokenType.LINE_TRIMMING_MODIFIER), 'TokenType.LINE_TRIMMING_MODIFIER');
        test.same(typeToString(TokenType.TAG_END, true), 'TAG_END');
        test.same(typeToString(TokenType.TAG_START, true), 'TAG_START');
        test.same(typeToString(TokenType.EOF, true), 'EOF');
        test.same(typeToString(TokenType.INTERPOLATION_END, true), 'INTERPOLATION_END');
        test.same(typeToString(TokenType.INTERPOLATION_START, true), 'INTERPOLATION_START');
        test.same(typeToString(TokenType.NAME, true), 'NAME');
        test.same(typeToString(TokenType.NUMBER, true), 'NUMBER');
        test.same(typeToString(TokenType.OPERATOR, true), 'OPERATOR');
        test.same(typeToString(TokenType.PUNCTUATION, true), 'PUNCTUATION');
        test.same(typeToString(TokenType.STRING, true), 'STRING');
        test.same(typeToString(TokenType.TEXT, true), 'TEXT');
        test.same(typeToString(TokenType.VARIABLE_END, true), 'VARIABLE_END');
        test.same(typeToString(TokenType.VARIABLE_START, true), 'VARIABLE_START');
        test.same(typeToString(TokenType.COMMENT_START, true), 'COMMENT_START');
        test.same(typeToString(TokenType.COMMENT_END, true), 'COMMENT_END');
        test.same(typeToString(TokenType.WHITESPACE, true), 'WHITESPACE');
        test.same(typeToString(TokenType.CLOSING_QUOTE, true), 'CLOSING_QUOTE');
        test.same(typeToString(TokenType.OPENING_QUOTE, true), 'OPENING_QUOTE');
        test.same(typeToString(TokenType.TRIMMING_MODIFIER, true), 'TRIMMING_MODIFIER');
        test.same(typeToString(TokenType.LINE_TRIMMING_MODIFIER, true), 'LINE_TRIMMING_MODIFIER');

        test.throws(function () {
            typeToString(-999 as any);
        }, 'Token type "-999" does not exist.');

        test.end();
    });

    test.end();
});