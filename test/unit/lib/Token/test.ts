import * as tape from 'tape';
import {Token} from '../../../../src/lib/Token';

tape('Token', (test) => {
    test.test('test', (test) => {
        test.test('accept a single parameter', (test) => {
            let token = new Token("TEXT", 'foo', 1, 1);

            test.true(token.test("TEXT"));
            test.false(token.test("STRING"));

            test.end();
        });

        test.test('accept two parameters', (test) => {
            test.test('with string as second parameter', (test) => {
                let token = new Token("TEXT", 'foo', 1, 1);

                test.true(token.test("TEXT", 'foo'));
                test.false(token.test("TEXT", 'bar'));

                test.end();
            });

            test.test('with number as second parameter', (test) => {
                let token = new Token("TEXT", '5', 1, 1);

                test.true(token.test("TEXT", 5));
                test.false(token.test("TEXT", 6));

                test.end();
            });

            test.test('with array of strings as second parameter', (test) => {
                let token = new Token("TEXT", 'foo', 1, 1);

                test.true(token.test("TEXT", ['foo', 'bar']));
                test.false(token.test("TEXT", ['fooo', 'bar']));

                test.end();
            });
        });

        test.end();
    });

    test.test('serialize', (test) => {
        let token = new Token("TEXT", '\nfoo\nbar\n', 1, 1);

        let expected = `
foo
bar
`;

        test.same(token.serialize(), expected);

        test.end();
    });

    test.test('toString', (test) => {
        let token = new Token("TEXT", '\nfoo\nbar\n', 1, 1);

        let expected = `TEXT(\nfoo\nbar\n)`;

        test.same(token.toString(), expected);
        
        test.test('on token with null content', (test) => {
            let token = new Token("TEXT", null, 1, 1);

            let expected = `TEXT()`;

            test.same(token.toString(), expected);

            test.end();
        });
    });

    test.end();
});