import {SyntaxError} from '../../../src/SyntaxError';
import * as tape from 'tape';

tape('SyntaxError', (test) => {
    test.test('constructor', (test) => {
        let error = new SyntaxError('foo', 1, 1);

        test.equals(error.message, 'foo', 'message should be set');
        test.equals(error.line, 1, 'line should be set');
        test.equals(error.column, 1, 'column should be set');

        test.end();
    });

    test.end();
});