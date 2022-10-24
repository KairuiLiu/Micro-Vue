import { NodeTypes } from '../src/ast';
import { baseParse } from '../src/parse';
import { transform } from '../src/transform';

describe('Parse', () => {
  describe('transform', () => {
    test('inter', () => {
      const ast = baseParse('<div>hi, {{message}}</div>');

      const plugin = (node) => {
        if (node.type === NodeTypes.TEXT) {
          node.content = node.content + "123";
        }
      };

      transform(ast, {
        nodeTransforms: [plugin],
      });

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        children: [
          {
            type: NodeTypes.TEXT,
            content: 'hi, 123',
          },
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'message',
            },
          },
        ],
      });
    });
  });
});
