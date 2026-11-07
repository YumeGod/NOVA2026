import { useEffect, useRef, useState } from 'react';
import { Mic, Square, LoaderCircle } from 'lucide-react';
async function wav(blob:Blob){
 const context=new AudioContext();
 try{const buffer=await context.decodeAudioData(await blob.arrayBuffer());const length=buffer.length;const result=new ArrayBuffer(44+length*2);const view=new DataView(result);const text=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};text(0,'RIFF');view.setUint32(4,36+length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length*2,true);for(let i=0;i<length;i++){let sample=0;for(let c=0;c<buffer.numberOfChannels;c++)sample+=buffer.getChannelData(c)[i]/buffer.numberOfChannels;sample=Math.max(-1,Math.min(1,sample));view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true)}return result}finally{await context.close()}
}
export function VoiceInput({value,onChange,disabled,onBusyChange}:{value:string;onChange:(text:string)=>void;disabled:boolean;onBusyChange?:(busy:boolean)=>void}){
 const [phase,setPhase]=useState('idle');
 useEffect(()=>{onBusyChange?.(phase!=='idle')},[phase,onBusyChange]);const [notice,setNotice]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const alive=useRef(true);const latest=useRef(value);latest.current=value;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop()}stream.current?.getTracks().forEach(t=>t.stop())}},[]);
 async function start(){
  if(recorder.current?.state==='recording'){recorder.current.stop();return}
  setNotice('');setPhase('starting');
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Recording is unavailable here. Use Chrome or Safari on localhost or HTTPS.');
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(!alive.current){media.getTracks().forEach(t=>t.stop());return}
   stream.current=media;const recording=new MediaRecorder(media);recorder.current=recording;const chunks:Blob[]=[];
   recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recording.onstop=async()=>{if(timer.current)clearTimeout(timer.current);media.getTracks().forEach(t=>t.stop());if(!alive.current)return;setPhase('transcribing');try{const audio=await wav(new Blob(chunks,{type:recording.mimeType}));const response=await fetch('/api/voice/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav'},body:audio});const data=await response.json();if(!response.ok)throw new Error(data.detail||'Transcription failed. Please retry.');if(alive.current){if(data.text){onChange([latest.current.trim(),data.text].filter(Boolean).join(' '));setNotice('Review your transcript, then send.')}else setNotice('No speech detected. Please try again.')}}catch(e){if(alive.current)setNotice(e instanceof Error?e.message:'Could not transcribe. Please retry.')}finally{if(alive.current)setPhase('idle')}};
   recording.start();setPhase('recording');timer.current=setTimeout(()=>{if(recording.state==='recording')recording.stop()},45000);
  }catch(e){stream.current?.getTracks().forEach(t=>t.stop());setPhase('idle');setNotice(e instanceof DOMException&&e.name==='NotAllowedError'?'Allow microphone access in your browser to record.':e instanceof Error?e.message:'Could not start recording.')}
 }
 return <div className="voice-control"><button type="button" className={'icon-button voice-button '+(phase==='recording'?'is-listening':'')} disabled={disabled||phase==='starting'||phase==='transcribing'} onClick={start} aria-label={phase==='recording'?'Stop recording':'Record voice message'} aria-pressed={phase==='recording'} title="Record up to 45 seconds. Audio is sent to our transcription provider when you stop.">{phase==='recording'?<Square size={17}/>:phase==='transcribing'?<LoaderCircle className="spin" size={19}/>:<Mic size={19}/>}</button><span className="voice-status" role="status">{phase==='recording'?'Recording… Tap stop (45s max).':phase==='transcribing'?'Transcribing…':phase==='starting'?'Opening microphone…':notice}</span></div>
}
