import * as tape from 'tape';
import {astVisitor, TokenStream} from '../../../../src/lib/TokenStream';
import {Token} from "../../../../src/lib/Token";

const sinon = require('sinon');

tape('TokenStream', (test) => {
    test.test('traversal', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        test.true(stream.current.test("NAME", 'foo'));
        test.true(stream.next().test("NAME", 'foo'), 'next returns the current token');
        test.true(stream.current.test("TEXT", 'foo'), 'next increments the pointer');
        stream.next();
        test.true(stream.current.test("STRING", 'foo'));
        stream.next();

        stream.rewind();
        test.true(stream.current.test("NAME", 'foo'), 'rewind actually rewinds the stream');

        test.true(stream.nextIf("NAME", 'foo').test("NAME", 'foo'), 'nextIf returns the tested token when the test is successful');
        test.true(stream.current.test("TEXT", 'foo'), 'nextIf increments the pointer when the test is successful');
        test.false(stream.nextIf("NAME", 'foo'));
        test.true(stream.nextIf("TEXT"), 'nextIf support a single parameter');

        test.end();
    });

    test.test('lookup', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        test.same(stream.look(-1), null);
        test.true(stream.look(0).test("NAME", 'foo'));
        test.true(stream.look().test("TEXT", 'foo'));
        test.true(stream.look(1).test("TEXT", 'foo'));
        test.true(stream.look(2).test("STRING", 'foo'));
        test.same(stream.look(3), null);
        stream.next();
        test.true(stream.look(-1).test("NAME", 'foo'));

        test.end();
    });

    test.test('test', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        test.true(stream.test("NAME", 'foo'));
        test.false(stream.test("TEXT", 'foo'));
        test.true(stream.test("NAME"));
        stream.next();
        test.true(stream.test("TEXT", 'foo'));

        test.end();
    });

    test.test('injection', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        stream.injectTokens([
            new Token("NAME", 'bar', 1, 1)
        ]);

        test.true(stream.test("NAME", 'bar'));

        stream.injectTokens([
            new Token("TEXT", 'bar', 1, 1),
            new Token("STRING", 'bar', 1, 1)
        ]);

        test.true(stream.test("TEXT", 'bar'));
        test.true(stream.look().test("STRING", 'bar'));
        test.true(stream.look(2).test("NAME", 'bar'));

        test.end();
    });

    test.test('toString', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        test.same(stream.toString(), `NAME(foo)
TEXT(foo)
STRING(foo)`);

        test.end();
    });

    test.test('serialize', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        test.same(stream.serialize(), `foofoofoo`);

        test.end();
    });

    test.test('traverse', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        let tokens = stream.traverse((token: Token, stream: TokenStream): Token => {
            if (token.test("TEXT")) {
                return token;
            }
        });

        test.true(tokens[0].test("TEXT"));

        test.end();
    });

    test.test('toAst', (test) => {
        let stream = new TokenStream([
            new Token("NAME", 'foo', 1, 1),
            new Token("TEXT", 'foo', 1, 1),
            new Token("STRING", 'foo', 1, 1)
        ]);

        let traverseSpy = sinon.spy(stream, 'traverse');

        let tokens = stream.toAst();

        test.same(traverseSpy.callCount, 1);
        test.true(traverseSpy.alwaysCalledWith(astVisitor));
        test.same(tokens, stream.tokens);

        test.end();
    });

    test.test('astVisitor', (test) => {
        let stream: TokenStream;

        stream = new TokenStream([
            new Token("EOF", null, 10, 5)
        ]);

        test.same(astVisitor(stream.current, stream), stream.current, 'keeps "EOF" untouched');

        stream = new TokenStream([
            new Token("NUMBER", '5.78', 10, 5)
        ]);

        test.true(astVisitor(stream.current, stream).test("NUMBER", 5.78), 'sanitizes "NUMBER" value');

        stream = new TokenStream([
            new Token("INTERPOLATION_START", '#{', 10, 5)
        ]);

        test.same(astVisitor(stream.current, stream), stream.current, 'keeps relevant token untouched');

        stream = new TokenStream([
            new Token("OPENING_QUOTE", '"', 1, 4),
            new Token("TRIMMING_MODIFIER", '-', 1, 1),
            new Token("WHITESPACE", ' ', 1, 2),
            new Token("LINE_TRIMMING_MODIFIER", '~', 1, 3),
            new Token("CLOSING_QUOTE", '"', 1, 5)
        ]);

        test.false(astVisitor(stream.current, stream), 'filters "OPENING_QUOTE" tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters "TRIMMING_MODIFIER" tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters "WHITESPACE" tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters "LINE_TRIMMING_MODIFIER" tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters "CLOSING_QUOTE" tokens');

        stream = new TokenStream([
            new Token("OPENING_QUOTE", '"', 1, 1),
            new Token("STRING", 'foo', 1, 2)
        ]);

        stream.next();

        test.same(astVisitor(stream.current, stream).column, 1, 'maps "STRING" tokens column to their corresponding "OPENING_QUOTE"');

        stream = new TokenStream([
            new Token("TEXT", 'foo\n ', 1, 1),
            new Token("TAG_START", '{%', 2, 1),
            new Token("TRIMMING_MODIFIER", '-', 2, 3)
        ]);

        test.true(astVisitor(stream.current, stream).test("TEXT", 'foo'), 'handles trimming modifier on left side');

        stream = new TokenStream([
            new Token("TRIMMING_MODIFIER", '-', 1, 1),
            new Token("TAG_END", '%}', 1, 2),
            new Token("TEXT", ' \nfoo', 1, 4)
        ]);

        stream.next();
        stream.next();

        test.true(astVisitor(stream.current, stream).test("TEXT", 'foo'), 'handles trimming modifier on right side');

        stream = new TokenStream([
            new Token("TEXT", 'foo\n ', 1, 1),
            new Token("TAG_START", '{%', 2, 1),
            new Token("LINE_TRIMMING_MODIFIER", '~', 2, 3)
        ]);

        test.true(astVisitor(stream.current, stream).test("TEXT", 'foo\n'), 'handles line trimming modifier on left side');

        stream = new TokenStream([
            new Token("LINE_TRIMMING_MODIFIER", '~', 1, 1),
            new Token("TAG_END", '%}', 1, 2),
            new Token("TEXT", ' \nfoo', 1, 4)
        ]);

        stream.next();
        stream.next();

        test.true(astVisitor(stream.current, stream).test("TEXT", '\nfoo'), 'handles line trimming modifier on right side');

        stream = new TokenStream([
            new Token("OPERATOR", 'foo       bar', 1, 1)
        ]);

        test.true(astVisitor(stream.current, stream).test("OPERATOR", 'foo bar'), 'removes unnecessary operator spaces');

        stream = new TokenStream([
            new Token("TEXT", '', 1, 1),
        ]);

        test.false(astVisitor(stream.current, stream), 'filters empty "TEXT" tokens out');

        stream = new TokenStream([
            new Token("STRING", '\\z\\t', 1, 1)
        ]);

        test.true(astVisitor(stream.current, stream).test("STRING", 'z\t'), 'converts C-style escape sequences');

        stream = new TokenStream([
            new Token("TEXT", 'a\\nb', 1, 1)
        ]);

        test.true(astVisitor(stream.current, stream).test("TEXT", 'a\\nb'), 'doesn\'t strip C slashes on "TEXT" tokens');

        test.test('replaces "OPENING_QUOTE" tokens immediately followed by a "CLOSING_QUOTE" token with empty string tokens', (test) => {
            let stream = new TokenStream([
                new Token("OPENING_QUOTE", '"', 1, 5),
                new Token("CLOSING_QUOTE", '"', 1, 6)
            ]);

            let token = astVisitor(stream.current, stream);

            test.true(token.test("STRING", ''));
            test.same(token.line, 1);
            test.same(token.column, 5);

            test.end();
        });

        test.end();
    });

    test.end();
});