import { main } from './core';

main().catch(error => {
  console.error('Application crashed:', error);
  process.exit(1);
});