import './ui/style.css';
import { Game } from './core/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('No se encontró el <canvas id="game">');

new Game(canvas);
