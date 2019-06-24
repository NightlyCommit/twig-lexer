import * as tape from 'tape';
import {Token} from '../../../src/Token';
import {TokenType} from '../../../src/TokenType';

tape('Token', (test) => {
    test.test('test', (test) => {
        test.test('accept a single parameter', (test) => {
            let token = new Token(TokenType.TEXT, 'foo', 1, 1);

            test.true(token.test(TokenType.TEXT));
            test.false(token.test(TokenType.STRING));

            test.end();
        });

        test.test('accept two parameters', (test) => {
            test.test('with string as second parameter', (test) => {
                let token = new Token(TokenType.TEXT, 'foo', 1, 1);

                test.true(token.test(TokenType.TEXT, 'foo'));
                test.false(token.test(TokenType.TEXT, 'bar'));

                test.end();
            });

            test.test('with number as second parameter', (test) => {
                let token = new Token(TokenType.TEXT, '5', 1, 1);

                test.true(token.test(TokenType.TEXT, 5));
                test.false(token.test(TokenType.TEXT, 6));

                test.end();
            });

            test.test('with array of strings as second parameter', (test) => {
                let token = new Token(TokenType.TEXT, 'foo', 1, 1);

                test.true(token.test(TokenType.TEXT, ['foo', 'bar']));
                test.false(token.test(TokenType.TEXT, ['fooo', 'bar']));

                test.end();
            });
        });

        test.end();
    });

    test.test('serialize', (test) => {
        let token = new Token(TokenType.TEXT, '\nfoo\nbar\n', 1, 1);

        let expected = `
foo
bar
`;

        test.same(token.serialize(), expected);

        test.end();
    });

    test.test('toString', (test) => {
        let token = new Token(TokenType.TEXT, '\nfoo\nbar\n', 1, 1);

        let expected = `TEXT(\nfoo\nbar\n)`;

        test.same(token.toString(), expected);

        test.end();

        test.test('on token with null content', (test) => {
            let token = new Token(TokenType.TEXT, null, 1, 1);

            let expected = `TEXT()`;

            test.same(token.toString(), expected);

            test.end();
        });
    });

    test.end();
});