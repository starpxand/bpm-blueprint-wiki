/* Векторный диплом: одна композиция для экрана, PNG и печати A4. */
(() => {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function lines(text, measure, limit) {
    const result = []; let line = '';
    for (const word of text.trim().split(/\s+/)) {
      if (line && measure(line + ' ' + word) > limit) { result.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    if (line) result.push(line);
    return result;
  }
  function svg(who, score, read, num, date, rank) {
    const context = document.createElement('canvas').getContext('2d');
    let size = 43;
    const measure = (s) => context.measureText(s).width;
    context.font = `bold ${size}px Georgia`;
    while (who.split(/\s+/).some((s) => measure(s) > 788) && size > 12) {
      size--; context.font = `bold ${size}px Georgia`;
    }
    const name = lines(who, measure, 788), top = name.length === 1 ? 419 : 385;
    const names = name.map((s,i) => `<tspan x="112" y="${top + i * 48}">${esc(s)}</tspan>`).join('');
    const labels = ['FLOW CHART','DFD','RAD','IDEF','ERD','UML','BPMN'];
    const nodes = labels.map((label,i) => {
      const a = -Math.PI/2 + i * Math.PI*2/7, x = 1170 + Math.cos(a)*122, y = 430 + Math.sin(a)*122;
      return `<path d="M1170 430L${x} ${y}" stroke="#afc2d0" opacity=".5"/><circle cx="${x}" cy="${y}" r="26" fill="#0c2340" stroke="#d9b46f" stroke-width="1.5"/><text x="${x}" y="${y+5}" fill="#f7f4ec" text-anchor="middle" font-size="14">0${i+1}</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="990" viewBox="0 0 1400 990" role="img" aria-labelledby="diplomaTitle diplomaDesc">
      <title id="diplomaTitle">Диплом Бюро нотаций: ${esc(who)}</title>
      <desc id="diplomaDesc">Тренажёр «Узнай нотацию». Результат ${score} из 10. ${esc(rank)}. ${esc(date)}.</desc>
      <defs><pattern id="diplomaGrid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#9ab6ca" stroke-width=".6" opacity=".22"/></pattern></defs>
      <rect width="1400" height="990" fill="#f7f4ec"/>
      <rect x="1000" width="400" height="990" fill="#0c2340"/>
      <rect x="1000" width="400" height="990" fill="url(#diplomaGrid)"/>
      <path d="M1000 0V990" stroke="#d9b46f" stroke-width="5"/>
      <rect x="28" y="28" width="1344" height="934" fill="none" stroke="#b3925c" stroke-width="1.5"/>
      <path d="M52 110V52H110M1290 52H1348V110M52 880V938H110M1290 938H1348V880" fill="none" stroke="#b3925c" stroke-width="3"/>
      <g font-family="Arial, sans-serif" fill="#142238">
        <g transform="translate(112 99)" fill="none" stroke="#142238" stroke-width="2.5"><rect width="44" height="44" rx="2"/><path d="M0 31H44M27 31V44M10 11H26M10 20H34"/></g>
        <text x="174" y="117" font-size="23" font-weight="700" letter-spacing="3">БЮРО НОТАЦИЙ</text>
        <text x="174" y="141" font-size="12" letter-spacing="2.5" fill="#586477">ОДИН ПРОЦЕСС · СЕМЬ ЧЕРТЕЖЕЙ</text>
        <path d="M112 181H900" stroke="#c9c1ad"/>
        <text x="108" y="278" font-family="Georgia, 'Times New Roman', serif" font-size="94" letter-spacing="7">Диплом</text>
        <text x="112" y="318" font-size="15" letter-spacing="3" fill="#826536">ЗА ПРОХОЖДЕНИЕ УЧЕБНОГО ТРЕНАЖЁРА</text>
        <text font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="700">${names}</text>
        <path d="M112 509H900" stroke="#b3925c" stroke-width="1.5"/>
        <text x="112" y="552" font-size="23">Результат прохождения тренажёра «Узнай нотацию»</text>
        <text x="112" y="586" font-size="20" fill="#4b5a72">по методам моделирования бизнес-процессов.</text>
        <text x="112" y="637" font-size="15" letter-spacing="1" fill="#4b5a72">FLOW CHART · DFD · RAD · IDEF · ERD · UML · BPMN</text>
        <path d="M112 680H900" stroke="#c9c1ad"/>
        <text x="112" y="718" font-size="13" letter-spacing="2" fill="#586477">РЕЗУЛЬТАТ</text>
        <text x="108" y="791" font-family="Georgia, 'Times New Roman', serif" font-size="70">${esc(score)}<tspan font-family="Arial, sans-serif" font-size="23" fill="#586477"> / 10</tspan></text>
        <path d="M350 704V803" stroke="#c9c1ad"/>
        <text x="385" y="718" font-size="13" letter-spacing="2" fill="#586477">РАЗРЯД БЮРО</text>
        <text x="385" y="759" font-family="Georgia, 'Times New Roman', serif" font-size="28">${esc(rank)}</text>
        <text x="385" y="793" font-size="17" fill="#4b5a72">Отмечено изученными: ${read} из 7 листов</text>
        <path d="M112 847H900" stroke="#c9c1ad"/>
        <text x="112" y="882" font-size="15">${esc(date)}</text>
        <text x="900" y="882" text-anchor="end" font-size="13" letter-spacing="1.5">СЕРИЯ БН · ${esc(num)}</text>
        <text x="112" y="916" font-size="12" fill="#586477">Учебное достижение мини-wiki. Не является документом об образовании.</text>
      </g>
      <g font-family="Arial, sans-serif" text-anchor="middle">
        <text x="1190" y="139" fill="#d9b46f" font-size="13" letter-spacing="4">АЛЬБОМ ЗНАНИЙ</text>
        <text x="1190" y="228" fill="#f7f4ec" font-family="Georgia, 'Times New Roman', serif" font-size="74">VII</text>
        <text x="1190" y="264" fill="#afc2d0" font-size="13" letter-spacing="2">ЯЗЫКОВ МОДЕЛИРОВАНИЯ</text>
        <g transform="translate(20 8)">${nodes}<circle cx="1170" cy="430" r="83" fill="none" stroke="#d9b46f" stroke-width=".8"/><path d="M1170 383L1217 430L1170 477L1123 430Z" fill="#173955" stroke="#d9b46f" stroke-width="2"/><circle cx="1170" cy="430" r="14" fill="none" stroke="#f7f4ec" stroke-width="2"/></g>
        <text x="1190" y="619" fill="#afc2d0" font-size="14" letter-spacing="1">СИСТЕМА НАЧИНАЕТСЯ</text>
        <text x="1190" y="643" fill="#afc2d0" font-size="14" letter-spacing="1">С ПОНЯТНОЙ СХЕМЫ</text>
        <g transform="translate(1190 782) rotate(-9)"><circle r="81" fill="none" stroke="#e98c6f" stroke-width="2"/><circle r="73" fill="none" stroke="#e98c6f" stroke-width=".8"/><path d="M-55 -21H55M-55 22H55" stroke="#e98c6f"/><text y="-36" fill="#e98c6f" font-size="12" letter-spacing="2">БЮРО НОТАЦИЙ</text><text y="7" fill="#e98c6f" font-size="23" font-weight="700">ЗАЧТЕНО</text><text y="45" fill="#e98c6f" font-size="12">${esc(date)}</text></g>
        <text x="1190" y="915" fill="#afc2d0" font-size="12" letter-spacing="2">УЗНАЙ НОТАЦИЮ</text>
      </g>
    </svg>`;
  }
  window.bureauCertificate = { svg, css: '.cert{width:100%;line-height:0;background:#f7f4ec;print-color-adjust:exact;-webkit-print-color-adjust:exact}.cert>svg{display:block;width:100%;height:auto;max-width:none!important}' };
})();
