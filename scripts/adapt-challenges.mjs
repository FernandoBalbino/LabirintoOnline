import {readFile,writeFile} from 'node:fs/promises';
const file='client/js/maze-game-challenges.mjs';let source=await readFile(file,'utf8');
source=source.replace('import { validateChallengeResponse } from "./maze-game-core.mjs";','// Interface original; validação exclusivamente no servidor.');
source=source.replace('constructor({ onCorrect, onWrong, onRestart, playSound })','constructor({ onCorrect, onWrong, onRestart, playSound, submitResponse })');
source=source.replace('this.onCorrect = onCorrect;','this.submitResponse = submitResponse;\n    this.pending = false;\n    this.onCorrect = onCorrect;');
source=source.replace('const task = challenge.solution;','const task = ({folder:"open-documents",window:"close-window",trash:"trash-file"})[challenge.payload.desktop];');
const gateStart=source.indexOf('${this.simState.restartConfirm ? `');const gateEnd=source.indexOf('<footer class="maze-challenge-footer">',gateStart);
source=source.slice(0,gateStart)+source.slice(gateEnd);
source=source.replace(/<button type="button" class="maze-restart-button"[^\n]+\n/,'<small>Precisa de ajuda? O professor pode liberar 30 segundos no painel.</small>\n');
const actionStart=source.indexOf('    if (["open-start", "open-explorer"].includes(action)');const actionEnd=source.indexOf('    this.submit(action);',source.indexOf('      return;',actionStart));
source=source.slice(0,actionStart)+source.slice(actionEnd);
const submitStart=source.indexOf('  submit(response) {');const submitEnd=source.indexOf('  showLocalFeedback(',submitStart);
source=source.slice(0,submitStart)+`  async submit(response) {
    if (this.resolved || this.pending || !this.challenge) return;
    this.pending = true;
    const current = this.challenge;
    try {
      const result = await this.submitResponse(current, response);
      if (this.challenge !== current) return;
      if (result.correct) {
        this.resolved = true;
        this.playSound?.('correct');
        this.onCorrect?.(current);
        this.feedback = { type:'success', title:'CORRETO!', message:result.message };
      } else {
        this.playSound?.('wrong');
        this.onWrong?.(current);
        this.feedback = { type:'error', title:'AINDA NÃO!', message:result.message };
        if(this.isSortTemplate()) this.assignments = result.accepted || {};
        else { this.selectedResponse=null; this.simState={}; }
      }
    } catch(error) {
      if(this.challenge !== current) return;
      this.feedback={type:'error',title:'AGUARDE',message:error.message};
    } finally { this.pending=false; if(this.challenge === current) this.render(); }
  }

`+source.slice(submitEnd);
await writeFile(file,source);console.log('Desafios adaptados para validação remota.');
