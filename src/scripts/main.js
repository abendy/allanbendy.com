import 'lazysizes';
import stickybits from 'stickybits';

// eslint-disable-next-line no-undef
stickybits('#header');

// set copyright year
const year = new Date().getFullYear();
document.getElementById('copyright').insertAdjacentHTML('beforeend', year);
