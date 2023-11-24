import * as tape from 'tape';
import {Lexer} from '../../../../src/lib/Lexer';
import {Token} from "../../../../src/lib/Token";
import {SyntaxError} from "../../../../src/lib/SyntaxError";
import {TokenType} from "../../../../src/index";

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

        test.same(token.type, type, 'type should be "' + type + '"');
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
                ["VARIABLE_START", '{{', 1, 1],
                ["NAME", 'foo', 1, 3],
                ["PUNCTUATION", '.', 1, 6],
                ["NAME", 'foo', 1, 7],
                ["VARIABLE_END", '}}', 1, 10],
                ["EOF", null, 1, 12]
            ]);

            test.end();
        });

        test.test('using bracket notation', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{foo[foo]}}');

            testTokens(test, [tokens[1], tokens[3]], [
                ["NAME", 'foo', 1, 3],
                ["NAME", 'foo', 1, 7],
            ]);

            test.end();
        });

        test.test('using a mix of dot and bracket notation', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{foo[foo.5[foo][foo]]}}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["NAME", 'foo', 1, 3],
                ["PUNCTUATION", '[', 1, 6],
                ["NAME", 'foo', 1, 7],
                ["PUNCTUATION", '.', 1, 10],
                ["NUMBER", 5, 1, 11],
                ["PUNCTUATION", '[', 1, 12],
                ["NAME", 'foo', 1, 13],
                ["PUNCTUATION", ']', 1, 16],
                ["PUNCTUATION", '[', 1, 17],
                ["NAME", 'foo', 1, 18],
                ["PUNCTUATION", ']', 1, 21],
                ["PUNCTUATION", ']', 1, 22],
                ["VARIABLE_END", '}}', 1, 23],
                ["EOF", null, 1, 25]
            ]);

            test.end();
        });

        test.test('bracket notation', (test) => {
            test.test('supports string', (test) => {
                let lexer = createLexer();
                let tokens = lexer.tokenize('{{foo["bar"]}}');

                testTokens(test, tokens, [
                    ["VARIABLE_START", '{{', 1, 1],
                    ["NAME", 'foo', 1, 3],
                    ["PUNCTUATION", '[', 1, 6],
                    ["OPENING_QUOTE", '"', 1, 7],
                    ["STRING", 'bar', 1, 8],
                    ["CLOSING_QUOTE", '"', 1, 11],
                    ["PUNCTUATION", ']', 1, 12],
                    ["VARIABLE_END", '}}', 1, 13],
                    ["EOF", null, 1, 15]
                ]);

                test.end();
            });

            test.test('supports string with interpolation_pair', (test) => {
                let lexer = createLexer();
                let tokens = lexer.tokenize('{{foo["#{bar}"]}}');

                testTokens(test, tokens, [
                    ["VARIABLE_START", '{{', 1, 1],
                    ["NAME", 'foo', 1, 3],
                    ["PUNCTUATION", '[', 1, 6],
                    ["OPENING_QUOTE", '"', 1, 7],
                    ["INTERPOLATION_START", '#{', 1, 8],
                    ["NAME", 'bar', 1, 10],
                    ["INTERPOLATION_END", '}', 1, 13],
                    ["CLOSING_QUOTE", '"', 1, 14],
                    ["PUNCTUATION", ']', 1, 15],
                    ["VARIABLE_END", '}}', 1, 16],
                    ["EOF", null, 1, 18]
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
            ["VARIABLE_START", '{{', 1, 1],
            ["WHITESPACE", ' ', 1, 3],
            ["PUNCTUATION", '{', 1, 4],
            ["OPENING_QUOTE", '"', 1, 5],
            ["STRING", 'a', 1, 6],
            ["CLOSING_QUOTE", '"', 1, 7],
            ["PUNCTUATION", ':', 1, 8],
            ["PUNCTUATION", '{', 1, 9],
            ["OPENING_QUOTE", '"', 1, 10],
            ["STRING", 'b', 1, 11],
            ["CLOSING_QUOTE", '"', 1, 12],
            ["PUNCTUATION", ':', 1, 13],
            ["OPENING_QUOTE", '"', 1, 14],
            ["STRING", 'c', 1, 15],
            ["CLOSING_QUOTE", '"', 1, 16],
            ["PUNCTUATION", '}', 1, 17],
            ["PUNCTUATION", '}', 1, 18],
            ["WHITESPACE", ' ', 1, 19],
            ["VARIABLE_END", '}}', 1, 20],
            ["EOF", null, 1, 22]
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
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'verbatim', 1, 4],
                ["WHITESPACE", ' ', 1, 12],
                ["TAG_END", '%}', 1, 13],
                ["TEXT", '\n    {{ "bla" }}\n', 1, 15],
                ["TAG_START", '{%', 3, 1],
                ["WHITESPACE", ' ', 3, 3],
                ["NAME", 'endverbatim', 3, 4],
                ["WHITESPACE", ' ', 3, 15],
                ["TAG_END", '%}', 3, 16],
                ["EOF", null, 3, 18]
            ]);

            test.end();
        });

        test.test('long', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% verbatim %}${'*'.repeat(100000)}{% endverbatim %}`);

            testTokens(test, tokens, [
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'verbatim', 1, 4],
                ["WHITESPACE", ' ', 1, 12],
                ["TAG_END", '%}', 1, 13],
                ["TEXT", '*'.repeat(100000), 1, 15],
                ["TAG_START", '{%', 1, 100015],
                ["WHITESPACE", ' ', 1, 100017],
                ["NAME", 'endverbatim', 1, 100018],
                ["WHITESPACE", ' ', 1, 100029],
                ["TAG_END", '%}', 1, 100030],
                ["EOF", null, 1, 100032]
            ]);

            test.end();
        });

        test.test('surrounded by data and containing Twig syntax', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`foo{% verbatim %}{{bla}}{% endverbatim %}foo`);

            testTokens(test, tokens, [
                ["TEXT", 'foo', 1, 1],
                ["TAG_START", '{%', 1, 4],
                ["WHITESPACE", ' ', 1, 6],
                ["NAME", 'verbatim', 1, 7],
                ["WHITESPACE", ' ', 1, 15],
                ["TAG_END", '%}', 1, 16],
                ["TEXT", '{{bla}}', 1, 18],
                ["TAG_START", '{%', 1, 25],
                ["WHITESPACE", ' ', 1, 27],
                ["NAME", 'endverbatim', 1, 28],
                ["WHITESPACE", ' ', 1, 39],
                ["TAG_END", '%}', 1, 40],
                ["TEXT", 'foo', 1, 42],
                ["EOF", null, 1, 45]
            ]);

            test.end();
        });

        test.test('surrounded by tags', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% if true %}{% verbatim %}foo{% endverbatim %}{% endif %}`);

            testTokens(test, tokens, [
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'if', 1, 4],
                ["WHITESPACE", ' ', 1, 6],
                ["NAME", 'true', 1, 7],
                ["WHITESPACE", ' ', 1, 11],
                ["TAG_END", '%}', 1, 12],
                ["TAG_START", '{%', 1, 14],
                ["WHITESPACE", ' ', 1, 16],
                ["NAME", 'verbatim', 1, 17],
                ["WHITESPACE", ' ', 1, 25],
                ["TAG_END", '%}', 1, 26],
                ["TEXT", 'foo', 1, 28],
                ["TAG_START", '{%', 1, 31],
                ["WHITESPACE", ' ', 1, 33],
                ["NAME", 'endverbatim', 1, 34],
                ["WHITESPACE", ' ', 1, 45],
                ["TAG_END", '%}', 1, 46],
                ["TAG_START", '{%', 1, 48],
                ["WHITESPACE", ' ', 1, 50],
                ["NAME", 'endif', 1, 51],
                ["WHITESPACE", ' ', 1, 56],
                ["TAG_END", '%}', 1, 57],
                ["EOF", null, 1, 59]
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
                ["VARIABLE_START", '{{', 1, 1],
                ["NAME", 'bla', 1, 3],
                ["VARIABLE_END", '}}', 1, 6],
                ["EOF", null, 1, 8]
            ]);

            test.end();
        });

        test.test('with whitespaces', (test) => {
            let source = `{{
bla }}`;

            let lexer = createLexer();
            let tokens = lexer.tokenize(source);

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", '\n', 1, 3],
                ["NAME", 'bla', 2, 1],
                ["WHITESPACE", ' ', 2, 4],
                ["VARIABLE_END", '}}', 2, 5],
                ["EOF", null, 2, 7]
            ]);

            test.end();
        });

        test.test('long', (test) => {
            let source = `{{ ${'x'.repeat(100000)} }}`;

            let lexer = createLexer();
            let tokens = lexer.tokenize(source);

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'x'.repeat(100000), 1, 4],
                ["WHITESPACE", ' ', 1, 100004],
                ["VARIABLE_END", '}}', 1, 100005],
                ["EOF", null, 1, 100007]
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
                    ["NAME", char, 1, 4]
                ]);
            }

            test.end();
        });

        test.test('with parenthesis', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ f() }}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'f', 1, 4],
                ["PUNCTUATION", '(', 1, 5],
                ["PUNCTUATION", ')', 1, 6],
                ["WHITESPACE", ' ', 1, 7],
                ["VARIABLE_END", '}}', 1, 8],
                ["EOF", null, 1, 10]
            ]);

            test.end();
        });

        test.test('with parenthesis and parameters', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ f("foo {{bar}}") }}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'f', 1, 4],
                ["PUNCTUATION", '(', 1, 5],
                ["OPENING_QUOTE", '"', 1, 6],
                ["STRING", 'foo {{bar}}', 1, 7],
                ["CLOSING_QUOTE", '"', 1, 18],
                ["PUNCTUATION", ')', 1, 19],
                ["WHITESPACE", ' ', 1, 20],
                ["VARIABLE_END", '}}', 1, 21],
                ["EOF", null, 1, 23]
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
                ["NAME", 'in', 1, 3]
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
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", '\n', 1, 3],
                ["NAME", 'bla', 2, 1],
                ["WHITESPACE", '\n', 2, 4],
                ["TAG_END", '%}', 3, 1],
                ["EOF", null, 3, 3]
            ]);

            test.end();
        });

        test.test('long', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% ${'x'.repeat(100000)} %}`);

            testTokens(test, tokens, [
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'x'.repeat(100000), 1, 4],
                ["WHITESPACE", ' ', 1, 100004],
                ["TAG_END", '%}', 1, 100005],
                ["EOF", null, 1, 100007]
            ]);

            test.end();
        });

        test.test('with special character as name', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{% § %}');

            testTokens(test, tokens, [
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", '§', 1, 4],
                ["WHITESPACE", ' ', 1, 5],
                ["TAG_END", '%}', 1, 6],
                ["EOF", null, 1, 8]
            ]);

            test.end();
        });

        test.test('with parameter', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{% foo bar %}`);

            testTokens(test, tokens, [
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'foo', 1, 4],
                ["WHITESPACE", ' ', 1, 7],
                ["NAME", 'bar', 1, 8],
                ["WHITESPACE", ' ', 1, 11],
                ["TAG_END", '%}', 1, 12],
                ["EOF", null, 1, 14]
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
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NUMBER", '922337203685477580700', 1, 4],
                ["WHITESPACE", ' ', 1, 25],
                ["VARIABLE_END", '}}', 1, 26],
                ["EOF", null, 1, 28]
            ]);

            test.end();
        });

        test.test('float', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ 92233720368547.7580700 }}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NUMBER", '92233720368547.7580700', 1, 4],
                ["WHITESPACE", ' ', 1, 26],
                ["VARIABLE_END", '}}', 1, 27],
                ["EOF", null, 1, 29]
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
                    ["VARIABLE_START", '{{', 1, 1],
                    ["WHITESPACE", ' ', 1, 3],
                    ["OPENING_QUOTE", fixture.quote, 1, 4],
                    ["STRING", fixture.expected, 1, 5],
                    ["CLOSING_QUOTE", fixture.quote, 1, 15],
                    ["WHITESPACE", ' ', 1, 16],
                    ["VARIABLE_END", '}}', 1, 17],
                    ["EOF", null, 1, 19]
                ]);
            });

            test.end();
        });

        test.test('with interpolation_pair', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('foo {{ "bar #{ baz + 1 }" }}');

            testTokens(test, tokens, [
                ["TEXT", 'foo ', 1, 1],
                ["VARIABLE_START", '{{', 1, 5],
                ["WHITESPACE", ' ', 1, 7],
                ["OPENING_QUOTE", '"', 1, 8],
                ["STRING", 'bar ', 1, 9],
                ["INTERPOLATION_START", '#{', 1, 13],
                ["WHITESPACE", ' ', 1, 15],
                ["NAME", 'baz', 1, 16],
                ["WHITESPACE", ' ', 1, 19],
                ["OPERATOR", '+', 1, 20],
                ["WHITESPACE", ' ', 1, 21],
                ["NUMBER", '1', 1, 22],
                ["WHITESPACE", ' ', 1, 23],
                ["INTERPOLATION_END", '}', 1, 24],
                ["CLOSING_QUOTE", '"', 1, 25],
                ["WHITESPACE", ' ', 1, 26],
                ["VARIABLE_END", '}}', 1, 27],
                ["EOF", null, 1, 29]
            ]);

            test.end();
        });

        test.test('with escaped interpolation_pair', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ "bar \\#{baz+1}" }}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["OPENING_QUOTE", '"', 1, 4],
                ["STRING", 'bar \\#{baz+1}', 1, 5],
                ["CLOSING_QUOTE", '"', 1, 18],
                ["WHITESPACE", ' ', 1, 19],
                ["VARIABLE_END", '}}', 1, 20],
                ["EOF", null, 1, 22]
            ]);

            test.end();
        });

        test.test('with hash', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{ "bar # baz" }}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["OPENING_QUOTE", '"', 1, 4],
                ["STRING", 'bar # baz', 1, 5],
                ["CLOSING_QUOTE", '"', 1, 14],
                ["WHITESPACE", ' ', 1, 15],
                ["VARIABLE_END", '}}', 1, 16],
                ["EOF", null, 1, 18]
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
                ["VARIABLE_START", '{{', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["OPENING_QUOTE", '"', 1, 4],
                ["STRING", 'bar ', 1, 5],
                ["INTERPOLATION_START", '#{', 1, 9],
                ["WHITESPACE", ' ', 1, 11],
                ["OPENING_QUOTE", '"', 1, 12],
                ["STRING", 'foo', 1, 13],
                ["INTERPOLATION_START", '#{', 1, 16],
                ["NAME", 'bar', 1, 18],
                ["INTERPOLATION_END", '}', 1, 21],
                ["CLOSING_QUOTE", '"', 1, 22],
                ["WHITESPACE", ' ', 1, 23],
                ["INTERPOLATION_END", '}', 1, 24],
                ["CLOSING_QUOTE", '"', 1, 25],
                ["WHITESPACE", ' ', 1, 26],
                ["VARIABLE_END", '}}', 1, 27],
                ["EOF", null, 1, 29]
            ]);

            test.end();
        });

        test.test('with nested interpolation_pair in block', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{% foo "bar #{ "foo#{bar}" }" %}');

            testTokens(test, tokens, [
                ["TAG_START", '{%', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["NAME", 'foo', 1, 4],
                ["WHITESPACE", ' ', 1, 7],
                ["OPENING_QUOTE", '"', 1, 8],
                ["STRING", 'bar ', 1, 9],
                ["INTERPOLATION_START", '#{', 1, 13],
                ["WHITESPACE", ' ', 1, 15],
                ["OPENING_QUOTE", '"', 1, 16],
                ["STRING", 'foo', 1, 17],
                ["INTERPOLATION_START", '#{', 1, 20],
                ["NAME", 'bar', 1, 22],
                ["INTERPOLATION_END", '}', 1, 25],
                ["CLOSING_QUOTE", '"', 1, 26],
                ["WHITESPACE", ' ', 1, 27],
                ["INTERPOLATION_END", '}', 1, 28],
                ["CLOSING_QUOTE", '"', 1, 29],
                ["WHITESPACE", ' ', 1, 30],
                ["TAG_END", '%}', 1, 31],
                ["EOF", null, 1, 33]
            ]);

            test.end();
        });

        test.test('empty', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{""}}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["OPENING_QUOTE", '"', 1, 3],
                ["CLOSING_QUOTE", '"', 1, 4],
                ["VARIABLE_END", '}}', 1, 5],
                ["EOF", null, 1, 7]
            ]);

            test.end();
        });

        test.test('delimited by single quotes', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{\'foo\'}}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["OPENING_QUOTE", '\'', 1, 3],
                ["STRING", 'foo', 1, 4],
                ["CLOSING_QUOTE", '\'', 1, 7],
                ["VARIABLE_END", '}}', 1, 8],
                ["EOF", null, 1, 10]
            ]);

            test.end();
        });

        test.test('delimited by single quotes with interpolation_pair', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{{\'foo#{bar}\'}}');

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["OPENING_QUOTE", '\'', 1, 3],
                ["STRING", 'foo#{bar}', 1, 4],
                ["CLOSING_QUOTE", '\'', 1, 13],
                ["VARIABLE_END", '}}', 1, 14],
                ["EOF", null, 1, 16]
            ]);

            test.end();
        });

        test.test('delimited by double quotes containing escaped double quotes', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize(`{{"string \\"interpolation\\": '#{var}'"}}`);

            testTokens(test, tokens, [
                ["VARIABLE_START", '{{', 1, 1],
                ["OPENING_QUOTE", '"', 1, 3],
                ["STRING", 'string \\"interpolation\\": \'', 1, 4],
                ["INTERPOLATION_START", '#{', 1, 31],
                ["NAME", 'var', 1, 33],
                ["INTERPOLATION_END", '}', 1, 36],
                ["STRING", "'", 1, 37],
                ["CLOSING_QUOTE", '"', 1, 38],
                ["VARIABLE_END", '}}', 1, 39],
                ["EOF", null, 1, 41]
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
            ["TEST_OPERATOR", 'is not', 1, 4],
            ["NAME", 'foo', 1, 11]
        ]);

        test.comment('space within a test operator can be any amount of whitespaces');

        tokens = lexer.tokenize('{{ is            not foo }}');

        testTokens(test, [tokens[2], tokens[4]], [
            ["TEST_OPERATOR", 'is            not', 1, 4],
            ["NAME", 'foo', 1, 22]
        ]);

        tokens = lexer.tokenize('{{ is foo }}');

        testTokens(test, [tokens[2], tokens[4]], [
            ["TEST_OPERATOR", 'is', 1, 4],
            ["NAME", 'foo', 1, 7]
        ]);

        tokens = lexer.tokenize('{{ is is not }}');

        testTokens(test, [tokens[2], tokens[4]], [
            ["TEST_OPERATOR", 'is', 1, 4],
            ["TEST_OPERATOR", 'is not', 1, 7]
        ]);

        tokens = lexer.tokenize('{{ is not is }}');

        testTokens(test, [tokens[2], tokens[4]], [
            ["TEST_OPERATOR", 'is not', 1, 4],
            ["TEST_OPERATOR", 'is', 1, 11]
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
                ["OPERATOR", operator, 1, 4]
            ]);
        }

        test.comment('containing a space');

        tokens = lexer.tokenize('{{custom          operator }}');

        testTokens(test, [tokens[1]], [
            ["OPERATOR", 'custom          operator', 1, 3]
        ]);

        test.comment('not ending with a letter and not followed by either a space or an opening parenthesis');

        tokens = lexer.tokenize('{{+}}');

        testTokens(test, [tokens[1]], [
            ["OPERATOR", '+', 1, 3]
        ]);

        test.test('ending with a letter and followed by a space or an opening parenthesis', (test) => {
            let lexer = createLexer();
            let tokens: Token[];

            tokens = lexer.tokenize('{{in(foo)}}');

            testTokens(test, [tokens[1]], [
                ["OPERATOR", 'in', 1, 3]
            ]);

            tokens = lexer.tokenize('{{in foo}}');

            testTokens(test, [tokens[1]], [
                ["OPERATOR", 'in', 1, 3]
            ]);

            tokens = lexer.tokenize('{{in\nfoo}}');

            testTokens(test, [tokens[1]], [
                ["OPERATOR", 'in', 1, 3]
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
            ["VARIABLE_START", '{{', 1, 1],
            ["WHITESPACE", ' ', 1, 3],
            ["NAME", 'foo', 1, 4],
            ["PUNCTUATION", '|', 1, 7],
            ["NAME", 'filter', 1, 8],
            ["PUNCTUATION", '(', 1, 14],
            ["NAME", 'v', 1, 15],
            ["WHITESPACE", ' ', 1, 16],
            ["ARROW", '=>', 1, 17],
            ["WHITESPACE", ' ', 1, 19],
            ["NAME", 'v', 1, 20],
            ["WHITESPACE", ' ', 1, 21],
            ["OPERATOR", '>', 1, 22],
            ["WHITESPACE", ' ', 1, 23],
            ["NUMBER", '1', 1, 24],
            ["PUNCTUATION", ')', 1, 25],
            ["WHITESPACE", ' ', 1, 26],
            ["VARIABLE_END", '}}', 1, 27],
            ["EOF", null, 1, 29]
        ]);

        test.end();
    })

    test.test('lex text', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize('foo ');

        testTokens(test, tokens, [
            ["TEXT", 'foo ', 1, 1],
            ["EOF", null, 1, 5]
        ]);

        test.test('containing line feeds', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('\r\rfoo\r\nbar\roof\n\r');

            testTokens(test, tokens, [
                ["TEXT", '\r\rfoo\r\nbar\roof\n\r', 1, 1],
                ["EOF", null, 7, 1]
            ]);

            test.end();
        });

        test.test('at start and end of a template', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('foo {{bar}} bar');

            testTokens(test, tokens, [
                ["TEXT", 'foo ', 1, 1],
                ["VARIABLE_START", '{{', 1, 5],
                ["NAME", 'bar', 1, 7],
                ["VARIABLE_END", '}}', 1, 10],
                ["TEXT", ' bar', 1, 12],
                ["EOF", null, 1, 16]
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
                ["TAG_START", '{%', 1, 1],
                ["TRIMMING_MODIFIER", '-', 1, 3],
                ["WHITESPACE", ' ', 1, 4],
                ["NAME", 'foo', 1, 5],
                ["WHITESPACE", ' ', 1, 8],
                ["TRIMMING_MODIFIER", '-', 1, 9],
                ["TAG_END", '%}', 1, 10],
                ["EOF", null, 1, 12]
            ]);

            test.end();
        });

        test.test('line whitespace trimming', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{%~ foo ~%}');

            testTokens(test, tokens, [
                ["TAG_START", '{%', 1, 1],
                ["LINE_TRIMMING_MODIFIER", '~', 1, 3],
                ["WHITESPACE", ' ', 1, 4],
                ["NAME", 'foo', 1, 5],
                ["WHITESPACE", ' ', 1, 8],
                ["LINE_TRIMMING_MODIFIER", '~', 1, 9],
                ["TAG_END", '%}', 1, 10],
                ["EOF", null, 1, 12]
            ]);

            test.end();
        });
    });

    test.test('lex comment', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize('{# foo bar #}');

        testTokens(test, tokens, [
            ["COMMENT_START", '{#', 1, 1],
            ["WHITESPACE", ' ', 1, 3],
            ["TEXT", 'foo bar', 1, 4],
            ["WHITESPACE", ' ', 1, 11],
            ["COMMENT_END", '#}', 1, 12],
            ["EOF", null, 1, 14]
        ]);

        test.test('long comments', (test) => {
            let value = '*'.repeat(100000);

            let lexer = createLexer();
            let tokens = lexer.tokenize('{#' + value + '#}');

            testTokens(test, tokens, [
                ["COMMENT_START", '{#', 1, 1],
                ["TEXT", value, 1, 3],
                ["COMMENT_END", '#}', 1, 100003],
                ["EOF", null, 1, 100005]
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
                ["COMMENT_START", '{#', 1, 1],
                ["TEXT", 'rn', 1, 3],
                ["COMMENT_END", '#}\r\n', 1, 5],
                ["COMMENT_START", '{#', 2, 1],
                ["TEXT", 'r', 2, 3],
                ["COMMENT_END", '#}\r', 2, 4],
                ["COMMENT_START", '{#', 3, 1],
                ["TEXT", 'n', 3, 3],
                ["COMMENT_END", '#}\n', 3, 4],
                ["EOF", null, 4, 1]
            ]);

            test.test('except when using line whitespace trimming on the right', (test) => {
                let tokens = lexer.tokenize(`{#foo~#}
bar`);

                testTokens(test, [tokens[3], tokens[4]], [
                    ["COMMENT_END", '#}', 1, 7],
                    ["TEXT", '\nbar', 1, 9]
                ]);

                test.end();
            });

            test.end();
        });

        test.test('followed by a non-comment', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{# a #}{{foo}}');

            testTokens(test, tokens, [
                ["COMMENT_START", '{#', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["TEXT", 'a', 1, 4],
                ["WHITESPACE", ' ', 1, 5],
                ["COMMENT_END", '#}', 1, 6],
                ["VARIABLE_START", '{{', 1, 8],
                ["NAME", 'foo', 1, 10],
                ["VARIABLE_END", '}}', 1, 13],
                ["EOF", null, 1, 15]
            ]);

            test.end();
        });

        test.test('containing block', (test) => {
            let lexer = createLexer();
            let tokens = lexer.tokenize('{# {{a}} #}');

            testTokens(test, tokens, [
                ["COMMENT_START", '{#', 1, 1],
                ["WHITESPACE", ' ', 1, 3],
                ["TEXT", '{{a}}', 1, 4],
                ["WHITESPACE", ' ', 1, 9],
                ["COMMENT_END", '#}', 1, 10],
                ["EOF", null, 1, 12]
            ]);

            test.end();
        });

        test.end();
    });

    test.test('lex punctuation', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize('{{ [1, 2] }}');

        testTokens(test, tokens, [
            ["VARIABLE_START", '{{', 1, 1],
            ["WHITESPACE", ' ', 1, 3],
            ["PUNCTUATION", '[', 1, 4],
            ["NUMBER", '1', 1, 5],
            ["PUNCTUATION", ',', 1, 6],
            ["WHITESPACE", ' ', 1, 7],
            ["NUMBER", '2', 1, 8],
            ["PUNCTUATION", ']', 1, 9],
            ["WHITESPACE", ' ', 1, 10],
            ["VARIABLE_END", '}}', 1, 11],
            ["EOF", null, 1, 13]
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
            ["TAG_END", '%}\n', 1, 6],
            ["TEXT", 'bar', 2, 1]
        ]);

        test.test('except when using line whitespace trimming on the right', (test) => {
            let tokens = lexer.tokenize(`{%foo~%}
bar`);

            testTokens(test, [tokens[3], tokens[4]], [
                ["TAG_END", '%}', 1, 7],
                ["TEXT", '\nbar', 1, 9]
            ]);

            test.end();
        });

        test.test('except by the verbatim and endverbatim tags', (test) => {
            let tokens = lexer.tokenize(`{%verbatim%}
bar{%endverbatim%}
foo`);
            testTokens(test, [tokens[2], tokens[3], tokens[6], tokens[7]], [
                ["TAG_END", '%}', 1, 11],
                ["TEXT", '\nbar', 1, 13],
                ["TAG_END", '%}', 2, 17],
                ["TEXT", '\nfoo', 2, 19],
            ]);

            test.end();
        });

        test.end();
    });

    test.test('supports the line tag', (test) => {
        let lexer = createLexer();
        let tokens = lexer.tokenize(`foo
{% line 5 %}
bar`);

        testTokens(test, tokens, [
            ["TEXT", 'foo\n', 1, 1],
            ["TAG_START", '{%', 2, 1],
            ["WHITESPACE", ' ', 2, 3],
            ["NAME", 'line', 2, 4],
            ["WHITESPACE", ' ', 2, 8],
            ["NUMBER", '5', 2, 9],
            ["WHITESPACE", ' ', 2, 10],
            ["TAG_END", '%}', 2, 11],
            ["TEXT", '\nbar', 5, 0],
            ["EOF", null, 6, 4]
        ]);

        tokens = lexer.tokenize(`foo
{%line 5%}
bar`);

        testTokens(test, tokens, [
            ["TEXT", 'foo\n', 1, 1],
            ["TAG_START", '{%', 2, 1],
            ["NAME", 'line', 2, 3],
            ["WHITESPACE", ' ', 2, 7],
            ["NUMBER", '5', 2, 8],
            ["TAG_END", '%}', 2, 9],
            ["TEXT", '\nbar', 5, 0],
            ["EOF", null, 6, 4]
        ]);

        test.end();
    });

    test.end();
});