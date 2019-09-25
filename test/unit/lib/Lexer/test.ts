import * as tape from 'tape';
import {Lexer} from '../../../../src/lib/Lexer';
import {Token} from "../../../../src/lib/Token";
import {TokenType, typeToString} from "../../../../src/lib/TokenType";
import {SyntaxError} from "../../../../src/lib/SyntaxError";

class CustomLexer extends Lexer {
    constructor() {
        super();

        this.operators.push('custom operator');
    }

    getOperators(): string[] {
        return this.operators;
    }
}

let createLexer = (): CustomLexer => {
    return new CustomLexer();
};

let testTokens = (test: tape.Test, tokens: Token[], data: [TokenType, any, number, number][]) => {
    let index: number = 0;

    for (let token of tokens) {
        let type = data[index][0];
        let value = data[index][1];
        let line = data[index][2];
        let column = data[index][3];

        test.same(token.type, type, 'type should be "' + typeToString(type) + '"');
        test.looseEqual(token.value, value, token.type + ' value should be "' + ((value && value.length > 80) ? value.substr(0, 77) + '...' : value) + '"');
        test.same(token.line, line, 'line should be ' + line);
        test.same(token.column, column, 'column should be ' + column);

        index++;
    }
};

tape('Lexer', (test) => {
    test.test('lex property', (test) => {
        test.test('using dot notation', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{foo.foo}}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.NAME, 'foo', 1, 3],
                [TokenType.PUNCTUATION, '.', 1, 6],
                [TokenType.NAME, 'foo', 1, 7],
                [TokenType.VARIABLE_END, '}}', 1, 10],
                [TokenType.EOF, null, 1, 12]
            ]);

            test.end();
        });

        test.test('using bracket notation', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{foo[foo]}}');

            testTokens(test, [tokens[1], tokens[3]], [
                [TokenType.NAME, 'foo', 1, 3],
                [TokenType.NAME, 'foo', 1, 7],
            ]);

            test.end();
        });

        test.test('using a mix of dot and bracket notation', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{foo[foo.5[foo][foo]]}}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.NAME, 'foo', 1, 3],
                [TokenType.PUNCTUATION, '[', 1, 6],
                [TokenType.NAME, 'foo', 1, 7],
                [TokenType.PUNCTUATION, '.', 1, 10],
                [TokenType.NUMBER, 5, 1, 11],
                [TokenType.PUNCTUATION, '[', 1, 12],
                [TokenType.NAME, 'foo', 1, 13],
                [TokenType.PUNCTUATION, ']', 1, 16],
                [TokenType.PUNCTUATION, '[', 1, 17],
                [TokenType.NAME, 'foo', 1, 18],
                [TokenType.PUNCTUATION, ']', 1, 21],
                [TokenType.PUNCTUATION, ']', 1, 22],
                [TokenType.VARIABLE_END, '}}', 1, 23],
                [TokenType.EOF, null, 1, 25]
            ]);

            test.end();
        });

        test.test('bracket notation', (test) => {
            test.test('supports string', (test) => {
                let lexer = createLexer();
                let tokens = lexer.tokenize('{{foo["bar"]}}');

                testTokens(test, tokens, [
                    [TokenType.VARIABLE_START, '{{', 1, 1],
                    [TokenType.NAME, 'foo', 1, 3],
                    [TokenType.PUNCTUATION, '[', 1, 6],
                    [TokenType.OPENING_QUOTE, '"', 1, 7],
                    [TokenType.STRING, 'bar', 1, 8],
                    [TokenType.CLOSING_QUOTE, '"', 1, 11],
                    [TokenType.PUNCTUATION, ']', 1, 12],
                    [TokenType.VARIABLE_END, '}}', 1, 13],
                    [TokenType.EOF, null, 1, 15]
                ]);

                test.end();
            });

            test.test('supports string with interpolation_pair', (test) => {
                let lexer = createLexer();
                let tokens = lexer.tokenize('{{foo["#{bar}"]}}');

                testTokens(test, tokens, [
                    [TokenType.VARIABLE_START, '{{', 1, 1],
                    [TokenType.NAME, 'foo', 1, 3],
                    [TokenType.PUNCTUATION, '[', 1, 6],
                    [TokenType.OPENING_QUOTE, '"', 1, 7],
                    [TokenType.INTERPOLATION_START, '#{', 1, 8],
                    [TokenType.NAME, 'bar', 1, 10],
                    [TokenType.INTERPOLATION_END, '}', 1, 13],
                    [TokenType.CLOSING_QUOTE, '"', 1, 14],
                    [TokenType.PUNCTUATION, ']', 1, 15],
                    [TokenType.VARIABLE_END, '}}', 1, 16],
                    [TokenType.EOF, null, 1, 18]
                ]);

                test.end();
            });

            test.end();
        });

        test.end();
    });

    test.test('lex bracket', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize('{{ {"a":{"b":"c"}} }}');

        testTokens(test, tokens, [
            [TokenType.VARIABLE_START, '{{', 1, 1],
            [TokenType.WHITESPACE, ' ', 1, 3],
            [TokenType.PUNCTUATION, '{', 1, 4],
            [TokenType.OPENING_QUOTE, '"', 1, 5],
            [TokenType.STRING, 'a', 1, 6],
            [TokenType.CLOSING_QUOTE, '"', 1, 7],
            [TokenType.PUNCTUATION, ':', 1, 8],
            [TokenType.PUNCTUATION, '{', 1, 9],
            [TokenType.OPENING_QUOTE, '"', 1, 10],
            [TokenType.STRING, 'b', 1, 11],
            [TokenType.CLOSING_QUOTE, '"', 1, 12],
            [TokenType.PUNCTUATION, ':', 1, 13],
            [TokenType.OPENING_QUOTE, '"', 1, 14],
            [TokenType.STRING, 'c', 1, 15],
            [TokenType.CLOSING_QUOTE, '"', 1, 16],
            [TokenType.PUNCTUATION, '}', 1, 17],
            [TokenType.PUNCTUATION, '}', 1, 18],
            [TokenType.WHITESPACE, ' ', 1, 19],
            [TokenType.VARIABLE_END, '}}', 1, 20],
            [TokenType.EOF, null, 1, 22]
        ]);

        test.test('with non-opening bracket', (test) => {
            let lexer = createLexer();

            try {
                lexer.tokenize('{{ a] }}');

                test.fail('should throw a syntax error');
            } catch (e) {
                test.same((e as SyntaxError).name, 'SyntaxError');
                test.same((e as SyntaxError).message, 'Unexpected "]".');
                test.same((e as SyntaxError).line, 1);
                test.same((e as SyntaxError).column, 5);
            }

            test.end();
        });

        test.end();
    });

    test.test('lex verbatim', (test) => {
        test.test('spanning multiple lines', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% verbatim %}
    {{ "bla" }}
{% endverbatim %}`);

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'verbatim', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 12],
                [TokenType.TAG_END, '%}', 1, 13],
                [TokenType.TEXT, '\n    {{ "bla" }}\n', 1, 15],
                [TokenType.TAG_START, '{%', 3, 1],
                [TokenType.WHITESPACE, ' ', 3, 3],
                [TokenType.NAME, 'endverbatim', 3, 4],
                [TokenType.WHITESPACE, ' ', 3, 15],
                [TokenType.TAG_END, '%}', 3, 16],
                [TokenType.EOF, null, 3, 18]
            ]);

            test.end();
        });

        test.test('long', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% verbatim %}${'*'.repeat(100000)}{% endverbatim %}`);

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'verbatim', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 12],
                [TokenType.TAG_END, '%}', 1, 13],
                [TokenType.TEXT, '*'.repeat(100000), 1, 15],
                [TokenType.TAG_START, '{%', 1, 100015],
                [TokenType.WHITESPACE, ' ', 1, 100017],
                [TokenType.NAME, 'endverbatim', 1, 100018],
                [TokenType.WHITESPACE, ' ', 1, 100029],
                [TokenType.TAG_END, '%}', 1, 100030],
                [TokenType.EOF, null, 1, 100032]
            ]);

            test.end();
        });

        test.test('surrounded by data and containing Twig syntax', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`foo{% verbatim %}{{bla}}{% endverbatim %}foo`);

            testTokens(test, tokens, [
                [TokenType.TEXT, 'foo', 1, 1],
                [TokenType.TAG_START, '{%', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 6],
                [TokenType.NAME, 'verbatim', 1, 7],
                [TokenType.WHITESPACE, ' ', 1, 15],
                [TokenType.TAG_END, '%}', 1, 16],
                [TokenType.TEXT, '{{bla}}', 1, 18],
                [TokenType.TAG_START, '{%', 1, 25],
                [TokenType.WHITESPACE, ' ', 1, 27],
                [TokenType.NAME, 'endverbatim', 1, 28],
                [TokenType.WHITESPACE, ' ', 1, 39],
                [TokenType.TAG_END, '%}', 1, 40],
                [TokenType.TEXT, 'foo', 1, 42],
                [TokenType.EOF, null, 1, 45]
            ]);

            test.end();
        });

        test.test('unclosed', (test) => {
            let lexer = createLexer();

            try {
                lexer.tokenize(`{% verbatim %}
{{ "bla" }}`);

                test.fail('should throw a syntax error');
            } catch (e) {
                test.same((e as SyntaxError).name, 'SyntaxError');
                test.same((e as SyntaxError).message, 'Unclosed verbatim opened at {1:1}.');
                test.same((e as SyntaxError).line, 2);
                test.same((e as SyntaxError).column, 12);
            }

            test.end();
        });

        test.end();
    });

    test.test('lex variable', (test) => {
        test.test('without whitespaces', (test) => {
            let source = `{{bla}}`;

            let lexer = createLexer();
            let tokens = lexer.tokenize(source);

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.NAME, 'bla', 1, 3],
                [TokenType.VARIABLE_END, '}}', 1, 6],
                [TokenType.EOF, null, 1, 8]
            ]);

            test.end();
        });

        test.test('with whitespaces', (test) => {
            let source = `{{
bla }}`;

            let lexer = createLexer();
            let tokens = lexer.tokenize(source);

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, '\n', 1, 3],
                [TokenType.NAME, 'bla', 2, 1],
                [TokenType.WHITESPACE, ' ', 2, 4],
                [TokenType.VARIABLE_END, '}}', 2, 5],
                [TokenType.EOF, null, 2, 7]
            ]);

            test.end();
        });

        test.test('long', (test) => {
            let source = `{{ ${'x'.repeat(100000)} }}`;

            let lexer = createLexer();
            let tokens = lexer.tokenize(source);

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'x'.repeat(100000), 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 100004],
                [TokenType.VARIABLE_END, '}}', 1, 100005],
                [TokenType.EOF, null, 1, 100007]
            ]);

            test.end();
        });

        test.test('with unicode character from 127 to 255 as name', (test) => {
            let lexer = createLexer();

            for (let code = 127; code <= 255; code++) {
                let char = String.fromCharCode(code);
                let tokens = lexer.tokenize(`{{ ${char} }}`);

                test.comment(`${code}: {{ ${char} }}`);

                testTokens(test, [tokens[2]], [
                    [TokenType.NAME, char, 1, 4]
                ]);
            }

            test.end();
        });

        test.test('with parenthesis', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ f() }}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'f', 1, 4],
                [TokenType.PUNCTUATION, '(', 1, 5],
                [TokenType.PUNCTUATION, ')', 1, 6],
                [TokenType.WHITESPACE, ' ', 1, 7],
                [TokenType.VARIABLE_END, '}}', 1, 8],
                [TokenType.EOF, null, 1, 10]
            ]);

            test.end();
        });

        test.test('with parenthesis and parameters', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ f("foo {{bar}}") }}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'f', 1, 4],
                [TokenType.PUNCTUATION, '(', 1, 5],
                [TokenType.OPENING_QUOTE, '"', 1, 6],
                [TokenType.STRING, 'foo {{bar}}', 1, 7],
                [TokenType.CLOSING_QUOTE, '"', 1, 18],
                [TokenType.PUNCTUATION, ')', 1, 19],
                [TokenType.WHITESPACE, ' ', 1, 20],
                [TokenType.VARIABLE_END, '}}', 1, 21],
                [TokenType.EOF, null, 1, 23]
            ]);

            test.end();
        });

        test.test('unclosed', (test) => {
            let lexer = createLexer();

            try {
                lexer.tokenize('{{ bar ');

                test.fail('should throw a syntax error');
            } catch (e) {
                test.same((e as SyntaxError).name, 'SyntaxError');
                test.same((e as SyntaxError).message, 'Unclosed variable opened at {1:1}.');
                test.same((e as SyntaxError).line, 1);
                test.same((e as SyntaxError).column, 8);
            }

            test.end();
        });

        test.test('named as an operator ending with a letter and not followed by either a space or an opening parenthesis', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{in}}');

            testTokens(test, [tokens[1]], [
                [TokenType.NAME, 'in', 1, 3]
            ]);

            test.end();
        });

        test.end();
    });

    test.test('lex tag', (test) => {
        test.test('spanning multiple lines', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{%
bla
%}`);

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.WHITESPACE, '\n', 1, 3],
                [TokenType.NAME, 'bla', 2, 1],
                [TokenType.WHITESPACE, '\n', 2, 4],
                [TokenType.TAG_END, '%}', 3, 1],
                [TokenType.EOF, null, 3, 3]
            ]);

            test.end();
        });

        test.test('long', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% ${'x'.repeat(100000)} %}`);

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'x'.repeat(100000), 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 100004],
                [TokenType.TAG_END, '%}', 1, 100005],
                [TokenType.EOF, null, 1, 100007]
            ]);

            test.end();
        });

        test.test('with special character as name', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{% § %}');

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, '§', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 5],
                [TokenType.TAG_END, '%}', 1, 6],
                [TokenType.EOF, null, 1, 8]
            ]);

            test.end();
        });

        test.test('with parameter', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% foo bar %}`);

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'foo', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 7],
                [TokenType.NAME, 'bar', 1, 8],
                [TokenType.WHITESPACE, ' ', 1, 11],
                [TokenType.TAG_END, '%}', 1, 12],
                [TokenType.EOF, null, 1, 14]
            ]);

            test.end();
        });

        test.test('unclosed', (test) => {
            let lexer = createLexer();

            try {
                lexer.tokenize('{% bar ');

                test.fail('should throw a syntax error');
            } catch (e) {
                test.same((e as SyntaxError).name, 'SyntaxError');
                test.same((e as SyntaxError).message, 'Unclosed tag opened at {1:1}.');
                test.same((e as SyntaxError).line, 1);
                test.same((e as SyntaxError).column, 8);
            }

            test.end();
        });

        test.end();
    });

    test.test('lex number', (test) => {
        test.test('integer', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ 922337203685477580700 }}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NUMBER, '922337203685477580700', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 25],
                [TokenType.VARIABLE_END, '}}', 1, 26],
                [TokenType.EOF, null, 1, 28]
            ]);

            test.end();
        });

        test.test('float', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ 92233720368547.7580700 }}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NUMBER, '92233720368547.7580700', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 26],
                [TokenType.VARIABLE_END, '}}', 1, 27],
                [TokenType.EOF, null, 1, 29]
            ]);

            test.end();
        });

        test.end();
    });

    test.test('lex string', (test) => {
        test.test('with escaped delimiter', (test) => {
            let fixtures = [
                {template: "{{ 'foo \\' bar' }}", name: "foo \\' bar", expected: "foo \\' bar", quote: '\''},
                {template: '{{ "foo \\" bar" }}', name: 'foo \\" bar', expected: 'foo \\" bar', quote: '"'}
            ];

            fixtures.forEach((fixture) => {
                let lexer = createLexer();
                let tokens = lexer.tokenize(fixture.template);

                testTokens(test, tokens, [
                    [TokenType.VARIABLE_START, '{{', 1, 1],
                    [TokenType.WHITESPACE, ' ', 1, 3],
                    [TokenType.OPENING_QUOTE, fixture.quote, 1, 4],
                    [TokenType.STRING, fixture.expected, 1, 5],
                    [TokenType.CLOSING_QUOTE, fixture.quote, 1, 15],
                    [TokenType.WHITESPACE, ' ', 1, 16],
                    [TokenType.VARIABLE_END, '}}', 1, 17],
                    [TokenType.EOF, null, 1, 19]
                ]);
            });

            test.end();
        });

        test.test('with interpolation_pair', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('foo {{ "bar #{ baz + 1 }" }}');

            testTokens(test, tokens, [
                [TokenType.TEXT, 'foo ', 1, 1],
                [TokenType.VARIABLE_START, '{{', 1, 5],
                [TokenType.WHITESPACE, ' ', 1, 7],
                [TokenType.OPENING_QUOTE, '"', 1, 8],
                [TokenType.STRING, 'bar ', 1, 9],
                [TokenType.INTERPOLATION_START, '#{', 1, 13],
                [TokenType.WHITESPACE, ' ', 1, 15],
                [TokenType.NAME, 'baz', 1, 16],
                [TokenType.WHITESPACE, ' ', 1, 19],
                [TokenType.OPERATOR, '+', 1, 20],
                [TokenType.WHITESPACE, ' ', 1, 21],
                [TokenType.NUMBER, '1', 1, 22],
                [TokenType.WHITESPACE, ' ', 1, 23],
                [TokenType.INTERPOLATION_END, '}', 1, 24],
                [TokenType.CLOSING_QUOTE, '"', 1, 25],
                [TokenType.WHITESPACE, ' ', 1, 26],
                [TokenType.VARIABLE_END, '}}', 1, 27],
                [TokenType.EOF, null, 1, 29]
            ]);

            test.end();
        });

        test.test('with escaped interpolation_pair', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ "bar \\#{baz+1}" }}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.OPENING_QUOTE, '"', 1, 4],
                [TokenType.STRING, 'bar \\#{baz+1}', 1, 5],
                [TokenType.CLOSING_QUOTE, '"', 1, 18],
                [TokenType.WHITESPACE, ' ', 1, 19],
                [TokenType.VARIABLE_END, '}}', 1, 20],
                [TokenType.EOF, null, 1, 22]
            ]);

            test.end();
        });

        test.test('with hash', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ "bar # baz" }}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.OPENING_QUOTE, '"', 1, 4],
                [TokenType.STRING, 'bar # baz', 1, 5],
                [TokenType.CLOSING_QUOTE, '"', 1, 14],
                [TokenType.WHITESPACE, ' ', 1, 15],
                [TokenType.VARIABLE_END, '}}', 1, 16],
                [TokenType.EOF, null, 1, 18]
            ]);

            test.end();
        });

        test.test('with unclosed interpolation', (test) => {
            let lexer = createLexer();

            try {
                lexer.tokenize(`{{ "bar #{x" }}
 `);

                test.fail('should throw a syntax error');
            } catch (e) {
                test.same((e as SyntaxError).name, 'SyntaxError');
                test.same((e as SyntaxError).message, 'Unclosed """ opened at {1:12}.');
                test.same((e as SyntaxError).line, 2);
                test.same((e as SyntaxError).column, 2);
            }

            test.end();
        });

        test.test('with nested interpolation_pair', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ "bar #{ "foo#{bar}" }" }}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.OPENING_QUOTE, '"', 1, 4],
                [TokenType.STRING, 'bar ', 1, 5],
                [TokenType.INTERPOLATION_START, '#{', 1, 9],
                [TokenType.WHITESPACE, ' ', 1, 11],
                [TokenType.OPENING_QUOTE, '"', 1, 12],
                [TokenType.STRING, 'foo', 1, 13],
                [TokenType.INTERPOLATION_START, '#{', 1, 16],
                [TokenType.NAME, 'bar', 1, 18],
                [TokenType.INTERPOLATION_END, '}', 1, 21],
                [TokenType.CLOSING_QUOTE, '"', 1, 22],
                [TokenType.WHITESPACE, ' ', 1, 23],
                [TokenType.INTERPOLATION_END, '}', 1, 24],
                [TokenType.CLOSING_QUOTE, '"', 1, 25],
                [TokenType.WHITESPACE, ' ', 1, 26],
                [TokenType.VARIABLE_END, '}}', 1, 27],
                [TokenType.EOF, null, 1, 29]
            ]);

            test.end();
        });

        test.test('with nested interpolation_pair in block', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{% foo "bar #{ "foo#{bar}" }" %}');

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.NAME, 'foo', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 7],
                [TokenType.OPENING_QUOTE, '"', 1, 8],
                [TokenType.STRING, 'bar ', 1, 9],
                [TokenType.INTERPOLATION_START, '#{', 1, 13],
                [TokenType.WHITESPACE, ' ', 1, 15],
                [TokenType.OPENING_QUOTE, '"', 1, 16],
                [TokenType.STRING, 'foo', 1, 17],
                [TokenType.INTERPOLATION_START, '#{', 1, 20],
                [TokenType.NAME, 'bar', 1, 22],
                [TokenType.INTERPOLATION_END, '}', 1, 25],
                [TokenType.CLOSING_QUOTE, '"', 1, 26],
                [TokenType.WHITESPACE, ' ', 1, 27],
                [TokenType.INTERPOLATION_END, '}', 1, 28],
                [TokenType.CLOSING_QUOTE, '"', 1, 29],
                [TokenType.WHITESPACE, ' ', 1, 30],
                [TokenType.TAG_END, '%}', 1, 31],
                [TokenType.EOF, null, 1, 33]
            ]);

            test.end();
        });

        test.test('empty', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{""}}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.OPENING_QUOTE, '"', 1, 3],
                [TokenType.CLOSING_QUOTE, '"', 1, 4],
                [TokenType.VARIABLE_END, '}}', 1, 5],
                [TokenType.EOF, null, 1, 7]
            ]);

            test.end();
        });

        test.test('delimited by single quotes', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{\'foo\'}}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.OPENING_QUOTE, '\'', 1, 3],
                [TokenType.STRING, 'foo', 1, 4],
                [TokenType.CLOSING_QUOTE, '\'', 1, 7],
                [TokenType.VARIABLE_END, '}}', 1, 8],
                [TokenType.EOF, null, 1, 10]
            ]);

            test.end();
        });

        test.test('delimited by single quotes with interpolation_pair', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{\'foo#{bar}\'}}');

            testTokens(test, tokens, [
                [TokenType.VARIABLE_START, '{{', 1, 1],
                [TokenType.OPENING_QUOTE, '\'', 1, 3],
                [TokenType.STRING, 'foo#{bar}', 1, 4],
                [TokenType.CLOSING_QUOTE, '\'', 1, 13],
                [TokenType.VARIABLE_END, '}}', 1, 14],
                [TokenType.EOF, null, 1, 16]
            ]);

            test.end();
        });

        test.end();
    });

    test.test('lex test operator', (test) => {
        let lexer = createLexer();
        let tokens: Token[];

        tokens = lexer.tokenize('{{ is not foo }}');

        testTokens(test, [tokens[2], tokens[4]], [
            [TokenType.TEST_OPERATOR, 'is not', 1, 4],
            [TokenType.NAME, 'foo', 1, 11]
        ]);

        test.comment('space within a test operator can be any amount of whitespaces');

        tokens = lexer.tokenize('{{ is            not foo }}');

        testTokens(test, [tokens[2], tokens[4]], [
            [TokenType.TEST_OPERATOR, 'is            not', 1, 4],
            [TokenType.NAME, 'foo', 1, 22]
        ]);

        tokens = lexer.tokenize('{{ is foo }}');

        testTokens(test, [tokens[2], tokens[4]], [
            [TokenType.TEST_OPERATOR, 'is', 1, 4],
            [TokenType.NAME, 'foo', 1, 7]
        ]);

        tokens = lexer.tokenize('{{ is is not }}');

        testTokens(test, [tokens[2], tokens[4]], [
            [TokenType.TEST_OPERATOR, 'is', 1, 4],
            [TokenType.TEST_OPERATOR, 'is not', 1, 7]
        ]);

        tokens = lexer.tokenize('{{ is not is }}');

        testTokens(test, [tokens[2], tokens[4]], [
            [TokenType.TEST_OPERATOR, 'is not', 1, 4],
            [TokenType.TEST_OPERATOR, 'is', 1, 11]
        ]);

        test.end();
    });

    test.test('lex operator', (test) => {
        let lexer = createLexer();
        let tokens: Token[];

        for (let operator of lexer.getOperators()) {
            test.comment(operator);

            let tokens = lexer.tokenize(`{{ ${operator} }}`);

            testTokens(test, [tokens[2]], [
                [TokenType.OPERATOR, operator, 1, 4]
            ]);
        }

        test.comment('containing a space');

        tokens = lexer.tokenize('{{custom          operator }}');

        testTokens(test, [tokens[1]], [
            [TokenType.OPERATOR, 'custom          operator', 1, 3]
        ]);

        test.comment('not ending with a letter and not followed by either a space or an opening parenthesis');

        tokens = lexer.tokenize('{{+}}');

        testTokens(test, [tokens[1]], [
            [TokenType.OPERATOR, '+', 1, 3]
        ]);

        test.test('ending with a letter and followed by a space or an opening parenthesis', (test) => {
            let lexer = createLexer();
            let tokens: Token[];

            tokens = lexer.tokenize('{{in(foo)}}');

            testTokens(test, [tokens[1]], [
                [TokenType.OPERATOR, 'in', 1, 3]
            ]);

            tokens = lexer.tokenize('{{in foo}}');

            testTokens(test, [tokens[1]], [
                [TokenType.OPERATOR, 'in', 1, 3]
            ]);

            tokens = lexer.tokenize('{{in\nfoo}}');

            testTokens(test, [tokens[1]], [
                [TokenType.OPERATOR, 'in', 1, 3]
            ]);

            test.end();
        });

        test.end();
    });

    test.test('lex arrow', (test) => {
        let lexer = createLexer();
        let tokens: Token[];
    
        tokens = lexer.tokenize('{{ foo|filter(v => v > 1) }}');
    
        testTokens(test, tokens, [
            [TokenType.VARIABLE_START, '{{', 1, 1],
            [TokenType.WHITESPACE, ' ', 1, 3],
            [TokenType.NAME, 'foo', 1, 4],
            [TokenType.PUNCTUATION, '|', 1, 7],
            [TokenType.NAME, 'filter', 1, 8],
            [TokenType.PUNCTUATION, '(', 1, 14],
            [TokenType.NAME, 'v', 1, 15],
            [TokenType.WHITESPACE, ' ', 1, 16],
            [TokenType.ARROW, '=>', 1, 17],
            [TokenType.WHITESPACE, ' ', 1, 19],
            [TokenType.NAME, 'v', 1, 20],
            [TokenType.WHITESPACE, ' ', 1, 21],
            [TokenType.OPERATOR, '>', 1, 22],
            [TokenType.WHITESPACE, ' ', 1, 23],
            [TokenType.NUMBER, '1', 1, 24],
            [TokenType.PUNCTUATION, ')', 1, 25],
            [TokenType.WHITESPACE, ' ', 1, 26],
            [TokenType.VARIABLE_END, '}}', 1, 27],
            [TokenType.EOF, null, 1, 29]
        ]);
    
        test.end();
    })

    test.test('lex text', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize('foo ');

        testTokens(test, tokens, [
            [TokenType.TEXT, 'foo ', 1, 1],
            [TokenType.EOF, null, 1, 5]
        ]);

        test.test('containing line feeds', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('\r\rfoo\r\nbar\roof\n\r');

            testTokens(test, tokens, [
                [TokenType.TEXT, '\r\rfoo\r\nbar\roof\n\r', 1, 1],
                [TokenType.EOF, null, 7, 1]
            ]);

            test.end();
        });

        test.test('at start and end of a template', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('foo {{bar}} bar');

            testTokens(test, tokens, [
                [TokenType.TEXT, 'foo ', 1, 1],
                [TokenType.VARIABLE_START, '{{', 1, 5],
                [TokenType.NAME, 'bar', 1, 7],
                [TokenType.VARIABLE_END, '}}', 1, 10],
                [TokenType.TEXT, ' bar', 1, 12],
                [TokenType.EOF, null, 1, 16]
            ]);

            test.end();
        });

        test.end();
    });

    test.test('lex whitespace control modifiers', (test) => {
        test.test('whitespace trimming', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{%- foo -%}');

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.TRIMMING_MODIFIER, '-', 1, 3],
                [TokenType.WHITESPACE, ' ', 1, 4],
                [TokenType.NAME, 'foo', 1, 5],
                [TokenType.WHITESPACE, ' ', 1, 8],
                [TokenType.TRIMMING_MODIFIER, '-', 1, 9],
                [TokenType.TAG_END, '%}', 1, 10],
                [TokenType.EOF, null, 1, 12]
            ]);

            test.end();
        });

        test.test('line whitespace trimming', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{%~ foo ~%}');

            testTokens(test, tokens, [
                [TokenType.TAG_START, '{%', 1, 1],
                [TokenType.LINE_TRIMMING_MODIFIER, '~', 1, 3],
                [TokenType.WHITESPACE, ' ', 1, 4],
                [TokenType.NAME, 'foo', 1, 5],
                [TokenType.WHITESPACE, ' ', 1, 8],
                [TokenType.LINE_TRIMMING_MODIFIER, '~', 1, 9],
                [TokenType.TAG_END, '%}', 1, 10],
                [TokenType.EOF, null, 1, 12]
            ]);

            test.end();
        });
    });

    test.test('lex comment', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize('{# foo bar #}');

        testTokens(test, tokens, [
            [TokenType.COMMENT_START, '{#', 1, 1],
            [TokenType.WHITESPACE, ' ', 1, 3],
            [TokenType.TEXT, 'foo bar', 1, 4],
            [TokenType.WHITESPACE, ' ', 1, 11],
            [TokenType.COMMENT_END, '#}', 1, 12],
            [TokenType.EOF, null, 1, 14]
        ]);

        test.test('long comments', (test) => {
            let value = '*'.repeat(100000);

            let lexer = createLexer();
            let tokens = lexer.tokenize('{#' + value + '#}');

            testTokens(test, tokens, [
                [TokenType.COMMENT_START, '{#', 1, 1],
                [TokenType.TEXT, value, 1, 3],
                [TokenType.COMMENT_END, '#}', 1, 100003],
                [TokenType.EOF, null, 1, 100005]
            ]);

            test.end();
        });

        test.test('unclosed', (test) => {
            try {
                lexer.tokenize(`{#
 `);

                test.fail('should throw a syntax error');
            } catch (e) {
                test.same((e as SyntaxError).name, 'SyntaxError');
                test.same((e as SyntaxError).message, 'Unclosed comment opened at {1:1}.');
                test.same((e as SyntaxError).line, 2);
                test.same((e as SyntaxError).column, 2);
            }

            test.end();
        });

        test.test('and consume next line separator', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{#rn#}\r\n{#r#}\r{#n#}\n');

            testTokens(test, tokens, [
                [TokenType.COMMENT_START, '{#', 1, 1],
                [TokenType.TEXT, 'rn', 1, 3],
                [TokenType.COMMENT_END, '#}\r\n', 1, 5],
                [TokenType.COMMENT_START, '{#', 2, 1],
                [TokenType.TEXT, 'r', 2, 3],
                [TokenType.COMMENT_END, '#}\r', 2, 4],
                [TokenType.COMMENT_START, '{#', 3, 1],
                [TokenType.TEXT, 'n', 3, 3],
                [TokenType.COMMENT_END, '#}\n', 3, 4],
                [TokenType.EOF, null, 4, 1]
            ]);

            test.end();
        });

        test.test('followed by a non-comment', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{# a #}{{foo}}');

            testTokens(test, tokens, [
                [TokenType.COMMENT_START, '{#', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.TEXT, 'a', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 5],
                [TokenType.COMMENT_END, '#}', 1, 6],
                [TokenType.VARIABLE_START, '{{', 1, 8],
                [TokenType.NAME, 'foo', 1, 10],
                [TokenType.VARIABLE_END, '}}', 1, 13],
                [TokenType.EOF, null, 1, 15]
            ]);

            test.end();
        });

        test.test('containing block', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{# {{a}} #}');

            testTokens(test, tokens, [
                [TokenType.COMMENT_START, '{#', 1, 1],
                [TokenType.WHITESPACE, ' ', 1, 3],
                [TokenType.TEXT, '{{a}}', 1, 4],
                [TokenType.WHITESPACE, ' ', 1, 9],
                [TokenType.COMMENT_END, '#}', 1, 10],
                [TokenType.EOF, null, 1, 12]
            ]);

            test.end();
        });

        test.end();
    });

    test.test('lex punctuation', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize('{{ [1, 2] }}');

        testTokens(test, tokens, [
            [TokenType.VARIABLE_START, '{{', 1, 1],
            [TokenType.WHITESPACE, ' ', 1, 3],
            [TokenType.PUNCTUATION, '[', 1, 4],
            [TokenType.NUMBER, '1', 1, 5],
            [TokenType.PUNCTUATION, ',', 1, 6],
            [TokenType.WHITESPACE, ' ', 1, 7],
            [TokenType.NUMBER, '2', 1, 8],
            [TokenType.PUNCTUATION, ']', 1, 9],
            [TokenType.WHITESPACE, ' ', 1, 10],
            [TokenType.VARIABLE_END, '}}', 1, 11],
            [TokenType.EOF, null, 1, 13]
        ]);

        test.test('unclosed bracket', (test) => {
            try {
                lexer.tokenize(`{{ [1 }}`);

                test.fail('should throw a syntax error');
            } catch (e) {
                test.same((e as SyntaxError).name, 'SyntaxError');
                test.same((e as SyntaxError).message, 'Unclosed bracket "[" opened at {1:4}.');
                test.same((e as SyntaxError).line, 1);
                test.same((e as SyntaxError).column, 7);
            }

            test.end();
        });

        test.end();
    });

    test.test('handle unlexable source', (test) => {
        let lexer = createLexer();

        try {
            lexer.tokenize('{{ ^ }}');

            test.fail('should throw a syntax error');
        } catch (e) {
            test.same((e as SyntaxError).name, 'SyntaxError');
            test.same((e as SyntaxError).message, 'Unexpected character "^ }}".');
            test.same((e as SyntaxError).line, 1);
            test.same((e as SyntaxError).column, 4);
        }

        test.end();
    });

    test.test('the first newline after a template tag is consumed by the tag', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize(`{%foo%}
bar`);

        testTokens(test, [tokens[2], tokens[3]], [
            [TokenType.TAG_END, '%}\n', 1, 6],
            [TokenType.TEXT, 'bar', 2, 1]
        ]);

        test.test('except by the verbatim and endverbatim tags', (test) => {
            let tokens = lexer.tokenize(`{%verbatim%}
bar{%endverbatim%}
foo`);
            testTokens(test, [tokens[2], tokens[3], tokens[6], tokens[7]], [
                [TokenType.TAG_END, '%}', 1, 11],
                [TokenType.TEXT, '\nbar', 1, 13],
                [TokenType.TAG_END, '%}', 2, 17],
                [TokenType.TEXT, '\nfoo', 2, 19],
            ]);

            test.end();
        });

        test.end();
    });

    test.end();
});