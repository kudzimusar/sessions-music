import type {StudioInvoice,StudioSettlement} from './registry';

export type SettlementExportLine={settlement:StudioSettlement;booking:{id:string;name:string;roomName:string;date:string}|null};

const csvCell=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
const usd=(cents:number)=>(cents/100).toFixed(2);

export function settlementCsv(studioName:string,period:string,invoice:StudioInvoice|null,lines:SettlementExportLine[]){
 const heading=['statement_period','studio','invoice_id','booking_reference','session_date','customer_or_group','room','settled_at','method','room_subtotal_usd','addons_usd','customer_fee_usd','studio_fee_usd','platform_fee_usd','customer_total_usd','studio_net_usd'];
 const rows=lines.map(({settlement:s,booking:b})=>[period,studioName,invoice?.id||'',s.bookingId,b?.date||'',b?.name||'',b?.roomName||'',s.settledAt||'',s.settledMethod||'',usd(s.pricing.roomSubtotal),usd(s.pricing.addOnSubtotal),usd(s.pricing.customerFee),usd(s.pricing.studioFee),usd(s.pricing.platformFee),usd(s.pricing.customerTotal),usd(s.pricing.studioNet)]);
 return [heading,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

const ascii=(value:string)=>value.normalize('NFKD').replace(/[^\x20-\x7E]/g,'?');
const pdfText=(value:string)=>ascii(value).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');
const bytes=(value:string)=>new TextEncoder().encode(value).length;

export function settlementPdf(studioName:string,period:string,invoice:StudioInvoice|null,lines:SettlementExportLine[]){
 const gross=lines.reduce((sum,line)=>sum+line.settlement.pricing.gross,0);
 const fee=lines.reduce((sum,line)=>sum+line.settlement.pricing.platformFee,0);
 const net=lines.reduce((sum,line)=>sum+line.settlement.pricing.studioNet,0);
 const text=[
  'SESSIONS - STUDIO STATEMENT',
  `Studio: ${studioName}`,
  `Period: ${period}`,
  `Invoice: ${invoice?.id||'Current statement - not closed'}`,
  `Currency: USD`,
  `Settled bookings: ${lines.length}`,
  `Gross: US$${usd(gross)}  Platform fee: US$${usd(fee)}  Studio net: US$${usd(net)}`,
  '',
  'Booking | Date | Method | Gross | Fee | Studio net',
  ...lines.map(({settlement:s,booking:b})=>`${s.bookingId} | ${b?.date||'-'} | ${s.settledMethod||'-'} | ${usd(s.pricing.gross)} | ${usd(s.pricing.platformFee)} | ${usd(s.pricing.studioNet)}`),
  '',
  'Sessions records settlement confirmations only. Payments were made directly to the studio.'
 ];
 const chunks:Array<string[]>=[];for(let i=0;i<text.length;i+=38)chunks.push(text.slice(i,i+38));if(!chunks.length)chunks.push([]);
 const fontId=3+chunks.length*2;const objects:string[]=[];
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[2]=`<< /Type /Pages /Kids [${chunks.map((_,i)=>`${3+i*2} 0 R`).join(' ')}] /Count ${chunks.length} >>`;
 chunks.forEach((chunk,index)=>{
  const pageId=3+index*2,streamId=pageId+1;
  const commands=`BT\n/F1 10 Tf\n45 748 Td\n16 TL\n${chunk.map(line=>`(${pdfText(line)}) Tj T*`).join('\n')}\nET`;
  objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`;
  objects[streamId]=`<< /Length ${bytes(commands)} >>\nstream\n${commands}\nendstream`;
 });
 objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
 let output='%PDF-1.4\n%Sessions\n';const offsets:number[]=[0];
 for(let i=1;i<objects.length;i++){offsets[i]=bytes(output);output+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=bytes(output);output+=`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(value=>String(value).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return new TextEncoder().encode(output);
}
