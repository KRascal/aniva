'use client';
import { useEffect } from 'react';
export default function FeatureError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[FeatureError]', error?.message); }, [error]);
  return (
    <div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',background:'#030712',color:'white',textAlign:'center',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      <div style={{fontSize:'2rem',marginBottom:'1rem',opacity:0.5}}>⚠️</div>
      <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'0.5rem'}}>読み込みエラー</h2>
      <p style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.5)',marginBottom:'1.5rem',maxWidth:280}}>問題が発生しました。再試行してください。</p>
      <div style={{display:'flex',gap:'0.75rem'}}>
        <button onClick={reset} style={{background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)',borderRadius:12,padding:'10px 20px',fontSize:'0.85rem',fontWeight:600,cursor:'pointer'}}>リトライ</button>
        <button onClick={()=>{window.location.href='/explore';}} style={{background:'linear-gradient(135deg,#7c3aed,#db2777)',color:'white',border:'none',borderRadius:12,padding:'10px 20px',fontSize:'0.85rem',fontWeight:700,cursor:'pointer'}}>ホームへ</button>
      </div>
    </div>
  );
}
