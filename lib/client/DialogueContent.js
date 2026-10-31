import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { dialogueBlocks } from './experience.js';
export function DialogueContent({ text, copy, copyLabel }) {
    return _jsx(_Fragment, { children: dialogueBlocks(text).map((block, i) => block.kind === 'code' ? _jsxs("section", { className: "petCodeCard", children: [_jsxs("header", { children: [_jsx("span", { children: block.language || 'Code' }), _jsx("button", { type: "button", onClick: e => { e.stopPropagation(); copy(block.text); }, children: copyLabel })] }), _jsx("pre", { tabIndex: 0, onClick: e => e.stopPropagation(), children: _jsx("code", { children: block.text }) })] }, i) : _jsx("span", { children: block.text.split('\n').map((line, j) => /^\s*(?:[-*+] |\d+\. )/.test(line) ? _jsxs("span", { className: "petListLine", children: [line, '\n'] }, j) : _jsxs(React.Fragment, { children: [line, j < block.text.split('\n').length - 1 ? '\n' : ''] }, j)) }, i)) });
}
//# sourceMappingURL=DialogueContent.js.map