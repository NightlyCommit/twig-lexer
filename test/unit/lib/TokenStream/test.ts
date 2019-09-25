import * as tape from 'tape';
import {astVisitor, TokenStream} from '../../../../src/lib/TokenStream';
import {Token} from "../../../../src/lib/Token";
import {TokenType} from "../../../../src/lib/TokenType";

const sinon = require('sinon');

tape('TokenStream', (test) => {
    test.test('traversal', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
        ]);

        test.true(stream.current.test(TokenType.NAME, 'foo'));
        test.true(stream.next().test(TokenType.NAME, 'foo'), 'next returns the current token');
        test.true(stream.current.test(TokenType.TEXT, 'foo'), 'next increments the pointer');
        stream.next();
        test.true(stream.current.test(TokenType.STRING, 'foo'));
        stream.next();

        stream.rewind();
        test.true(stream.current.test(TokenType.NAME, 'foo'), 'rewind actually rewinds the stream');

        test.true(stream.nextIf(TokenType.NAME, 'foo').test(TokenType.NAME, 'foo'), 'nextIf returns the tested token when the test is successful');
        test.true(stream.current.test(TokenType.TEXT, 'foo'), 'nextIf increments the pointer when the test is successful');
        test.false(stream.nextIf(TokenType.NAME, 'foo'));
        test.true(stream.nextIf(TokenType.TEXT), 'nextIf support a single parameter');

        test.end();
    });

    test.test('lookup', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
        ]);

        test.same(stream.look(-1), null);
        test.true(stream.look(0).test(TokenType.NAME, 'foo'));
        test.true(stream.look().test(TokenType.TEXT, 'foo'));
        test.true(stream.look(1).test(TokenType.TEXT, 'foo'));
        test.true(stream.look(2).test(TokenType.STRING, 'foo'));
        test.same(stream.look(3), null);
        stream.next();
        test.true(stream.look(-1).test(TokenType.NAME, 'foo'));

        test.end();
    });

    test.test('test', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
        ]);

        test.true(stream.test(TokenType.NAME, 'foo'));
        test.false(stream.test(TokenType.TEXT, 'foo'));
        test.true(stream.test(TokenType.NAME));
        stream.next();
        test.true(stream.test(TokenType.TEXT, 'foo'));

        test.end();
    });

    test.test('injection', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
        ]);

        stream.injectTokens([
            new Token(TokenType.NAME, 'bar', 1, 1)
        ]);

        test.true(stream.test(TokenType.NAME, 'bar'));

        stream.injectTokens([
            new Token(TokenType.TEXT, 'bar', 1, 1),
            new Token(TokenType.STRING, 'bar', 1, 1)
        ]);

        test.true(stream.test(TokenType.TEXT, 'bar'));
        test.true(stream.look().test(TokenType.STRING, 'bar'));
        test.true(stream.look(2).test(TokenType.NAME, 'bar'));

        test.end();
    });

    test.test('toString', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
        ]);

        test.same(stream.toString(), `NAME(foo)
TEXT(foo)
STRING(foo)`);

        test.end();
    });

    test.test('serialize', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
        ]);

        test.same(stream.serialize(), `foofoofoo`);

        test.end();
    });

    test.test('traverse', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
        ]);

        let tokens = stream.traverse((token: Token, stream: TokenStream): Token => {
            if (token.test(TokenType.TEXT)) {
                return token;
            }
        });

        test.true(tokens[0].test(TokenType.TEXT));

        test.end();
    });

    test.test('toAst', (test) => {
        let stream = new TokenStream([
            new Token(TokenType.NAME, 'foo', 1, 1),
            new Token(TokenType.TEXT, 'foo', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 1)
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
            new Token(TokenType.EOF, null, 10, 5)
        ]);

        test.same(astVisitor(stream.current, stream), stream.current, 'keeps EOF untouched');

        stream = new TokenStream([
            new Token(TokenType.NUMBER, '5.78', 10, 5)
        ]);

        test.true(astVisitor(stream.current, stream).test(TokenType.NUMBER, 5.78), 'sanitizes NUMBER value');

        stream = new TokenStream([
            new Token(TokenType.INTERPOLATION_START, '#{', 10, 5)
        ]);

        test.same(astVisitor(stream.current, stream), stream.current, 'keeps relevant token untouched');

        stream = new TokenStream([
            new Token(TokenType.OPENING_QUOTE, '"', 1, 4),
            new Token(TokenType.TRIMMING_MODIFIER, '-', 1, 1),
            new Token(TokenType.WHITESPACE, ' ', 1, 2),
            new Token(TokenType.LINE_TRIMMING_MODIFIER, '~', 1, 3),
            new Token(TokenType.CLOSING_QUOTE, '"', 1, 5)
        ]);

        test.false(astVisitor(stream.current, stream), 'filters OPENING_QUOTE tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters TRIMMING_MODIFIER tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters WHITESPACE tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters LINE_TRIMMING_MODIFIER tokens');
        stream.next();
        test.false(astVisitor(stream.current, stream), 'filters CLOSING_QUOTE tokens');

        stream = new TokenStream([
            new Token(TokenType.OPENING_QUOTE, '"', 1, 1),
            new Token(TokenType.STRING, 'foo', 1, 2)
        ]);

        stream.next();

        test.same(astVisitor(stream.current, stream).column, 1, 'maps STRING tokens column to their corresponding OPENING_QUOTE');

        stream = new TokenStream([
            new Token(TokenType.TEXT, 'foo\n ', 1, 1),
            new Token(TokenType.TAG_START, '{%', 2, 1),
            new Token(TokenType.TRIMMING_MODIFIER, '-', 2, 3)
        ]);

        test.true(astVisitor(stream.current, stream).test(TokenType.TEXT, 'foo'), 'handles trimming modifier on left side');

        stream = new TokenStream([
            new Token(TokenType.TRIMMING_MODIFIER, '-', 1, 1),
            new Token(TokenType.TAG_END, '%}', 1, 2),
            new Token(TokenType.TEXT, ' \nfoo', 1, 4)
        ]);

        stream.next();
        stream.next();

        test.true(astVisitor(stream.current, stream).test(TokenType.TEXT, 'foo'), 'handles trimming modifier on right side');

        stream = new TokenStream([
            new Token(TokenType.TEXT, 'foo\n ', 1, 1),
            new Token(TokenType.TAG_START, '{%', 2, 1),
            new Token(TokenType.LINE_TRIMMING_MODIFIER, '~', 2, 3)
        ]);

        test.true(astVisitor(stream.current, stream).test(TokenType.TEXT, 'foo\n'), 'handles line trimming modifier on left side');

        stream = new TokenStream([
            new Token(TokenType.LINE_TRIMMING_MODIFIER, '~', 1, 1),
            new Token(TokenType.TAG_END, '%}', 1, 2),
            new Token(TokenType.TEXT, ' \nfoo', 1, 4)
        ]);

        stream.next();
        stream.next();

        test.true(astVisitor(stream.current, stream).test(TokenType.TEXT, '\nfoo'), 'handles line trimming modifier on right side');

        stream = new TokenStream([
            new Token(TokenType.OPERATOR, 'foo       bar', 1, 1)
        ]);

        test.true(astVisitor(stream.current, stream).test(TokenType.OPERATOR, 'foo bar'), 'removes unnecessary operator spaces');

        stream = new TokenStream([
            new Token(TokenType.TEXT, '', 1, 1),
        ]);

        test.false(astVisitor(stream.current, stream), 'filters empty TEXT tokens out');

        stream = new TokenStream([
            new Token(TokenType.STRING, '\\z\\t', 1, 1)
        ]);

        test.true(astVisitor(stream.current, stream).test(TokenType.STRING, 'z\t'), 'converts C-style escape sequences');

        test.test('replaces OPENING_QUOTE tokens immediately followed by a CLOSING_QUOTE token with empty string tokens', (test) => {
            let stream = new TokenStream([
                new Token(TokenType.OPENING_QUOTE, '"', 1, 5),
                new Token(TokenType.CLOSING_QUOTE, '"', 1, 6)
            ]);

            let token = astVisitor(stream.current, stream);

            test.true(token.test(TokenType.STRING, ''));
            test.same(token.line, 1);
            test.same(token.column, 5);

            test.end();
        });

        test.end();
    });

    test.end();
});