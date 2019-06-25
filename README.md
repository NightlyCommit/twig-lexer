# twig-lexer [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage percentage][coveralls-image]][coveralls-url]

> A lossless Twig lexer

## Installation

```bash
npm install twig-lexer --save-dev
```

## Usage

```typescript
import {TwigLexer} from 'twig-lexer';

let lexer = new TwigLexer();

let tokens = lexer.tokenize('Hello {{world}}!');
```

## API

Read the [documentation](https://nightlycommit.github.io/twig-lexer) for more information.

## About Twig specifications - or lack thereof

As incredible as it sounds, Twig is a language with no official specifications - even internally at SensioLabs, [it seems](https://github.com/twigphp/Twig/issues/3066#issuecomment-502672166). As such, it is subject to interpretations and twig-lexer is one of them. It's very close to TwigPHP lexer (and as such implements things like [the operator confusion](https://github.com/twigphp/Twig/issues/3066)) but also outputs some token types that are not output by TwigPHP lexer - like `OPENING_QUOTE` or `WHITESPACE` - or with different names - like `TAG_START` instead of `BLOCK_START`.

When (if) official specifications are available, twig-lexer will be updated to match them.

## License

Apache-2.0 © [Eric MORAND]()

[npm-image]: https://badge.fury.io/js/twig-lexer.svg
[npm-url]: https://npmjs.org/package/twig-lexer
[travis-image]: https://travis-ci.org/NightlyCommit/twig-lexer.svg?branch=master
[travis-url]: https://travis-ci.org/NightlyCommit/twig-lexer
[coveralls-image]: https://coveralls.io/repos/github/NightlyCommit/twig-lexer/badge.svg
[coveralls-url]: https://coveralls.io/github/NightlyCommit/twig-lexer