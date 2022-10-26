import { createApp } from './micro-vue.esm.js';
import Reactivity1 from './components/Reactivity1.js';
import Reactivity2 from './components/Reactivity2.js';
import RunTimeCore1 from './components/RunTimeCore1.js';
import RunTimeCore2 from './components/RunTimeCore2.js';
import RunTimeDom1 from './components/RunTimeDom1.js';
import CompilerCore1 from './components/CompilerCore1.js';

createApp(Reactivity1).mount('#reactivity_playground_1');
createApp(Reactivity2).mount('#reactivity_playground_2');
createApp(RunTimeCore1).mount('#runtime_core_playground_1');
createApp(RunTimeCore2).mount('#runtime_core_playground_2');
createApp(RunTimeDom1).mount('#runtime_dom_playground_1');
createApp(CompilerCore1).mount('#compiler_core_playground_1');
