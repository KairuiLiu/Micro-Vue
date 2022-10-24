import { NodeTypes } from './ast';

function createParserContext(content) {
  return {
    source: content,
  };
}

function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
  };
}

function parseChildren(context) {
  const nodes = [] as any[];
  let node = null as any;
  while (context.source) {
    if (context.source.startsWith('{{')) node = parseInterpolation(context);
    else if (/^<[a-zA-Z]/.test(context.source)) node = parseElement(context);
    else node = parseText(context);
    nodes.push(node);
  }
  return nodes;
}

function parseText(context) {
  let content = context.source;
  if (~content.indexOf('{{')) {
    content = content.slice(0, content.indexOf('{{') );
  } else if (/<\/?[a-zA-Z].+/.test(content)) {
    content = content.slice(
      0,
      content.length - content.match(/<\/?[a-zA-Z].+/).length
    );
  }
  adviceBy(context, content.length);
  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseElement(context) {
  const tagMatch = context.source.match(/^<([a-zA-Z]*)>(.*)<\/\1>/);
  const tag = tagMatch[1];
  adviceBy(context, tagMatch[0].length);
  return {
    type: NodeTypes.ELEMENT,
    tag,
    children: parseChildren(createParserContext(tagMatch[2])),
  };
}

function parseInterpolation(context) {
  const closeDelimiter = '}}';
  const openDelimiter = '{{';

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );

  adviceBy(context, openDelimiter.length);

  const content = context.source
    .slice(0, closeIndex - openDelimiter.length)
    .trim();
  adviceBy(context, closeIndex);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

function adviceBy(context, length) {
  context.source = context.source.slice(length);
}

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}
