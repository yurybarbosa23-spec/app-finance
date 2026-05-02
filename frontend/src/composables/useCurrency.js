export function useCurrency() {

  // Formata número → "R$ 1.234,56" (espaço normal, sem \u00a0)
  function formatar(valor) {
    const n = Number(valor) || 0
    return 'R$ ' + n.toFixed(2)
      .replace('.', ',')
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  }

  // Máscara enquanto digita
  function mascaraMoeda(e) {
    let v = e.target.value.replace(/\D/g, '')
    v = (parseInt(v || '0') / 100).toFixed(2)
    v = v.replace('.', ',')
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
    e.target.value = 'R$ ' + v
  }

  // Converte string formatada → número (robusto contra \u00a0 e variações)
  function parseMoeda(valor) {
    if (typeof valor === 'number') return valor
    return parseFloat(
      String(valor)
        .replace(/R\$\s*/gu, '')   // remove R$ + qualquer espaço (inclusive \u00a0)
        .replace(/\u00a0/g, '')    // remove non-breaking space explicitamente
        .replace(/\s/g, '')        // remove espaços restantes
        .replace(/\./g, '')        // remove separador de milhar
        .replace(',', '.')         // troca vírgula decimal por ponto
    ) || 0
  }

  // Formata número para input (sem símbolo, pronto para editar)
  function formatarParaInput(valor) {
    const n = Number(valor) || 0
    return 'R$ ' + n.toFixed(2)
      .replace('.', ',')
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  }

  return { mascaraMoeda, parseMoeda, formatar, formatarParaInput }
}