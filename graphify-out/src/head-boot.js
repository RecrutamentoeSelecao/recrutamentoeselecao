/* ---------------------------------------------------------------
   Camada só desta versão avulsa (GitHub / arquivo local).
   Dentro do artefato quem guarda os dados é a plataforma; aqui não
   existe plataforma, então o Salvar grava no próprio navegador e a
   leitura vem de lá. Nada muda no resto do sistema.

   Regra importante: só capturamos pedidos RELATIVOS (o dados.json
   que mora ao lado desta página). Endereços absolutos — em especial
   https://api.github.com/repos/.../contents/dados.json — passam
   direto para a rede. Sem isso, a sincronização com o GitHub nunca
   sai do navegador.
   --------------------------------------------------------------- */
(function(){
  window.__standalone = true;   /* esta é a versão em arquivo: sem bloqueio de rede */
  var CHAVE = 'fagron-rs-html';
  var fetchOriginal = window.fetch ? window.fetch.bind(window) : null;

  function ehSementeLocal(url){
    var alvo = (url && typeof url === 'object' && url.url) ? url.url : String(url);
    if (/^[a-z][a-z0-9+.-]*:/i.test(alvo)) return false;   /* http:, https:, data:, blob: ... */
    if (alvo.indexOf('//') === 0) return false;            /* //host/... também é absoluto */
    alvo = alvo.replace(/[?#].*$/, '');
    return alvo.split('/').pop() === 'dados.json';
  }

  window.fetch = function(url, opts){
    if (ehSementeLocal(url)){
      var b = null;
      try { b = localStorage.getItem(CHAVE); } catch (e) {}
      return Promise.resolve(b
        ? new Response(b, {status:200, headers:{'Content-Type':'application/json'}})
        : new Response('', {status:404}));
    }
    return fetchOriginal ? fetchOriginal(url, opts) : Promise.reject(new Error('sem rede'));
  };
  window.claude = {
    use: function(nome){
      if (nome !== 'artifact') return Promise.resolve(null);
      return Promise.resolve({
        publish: function(arg){
          var dados = (typeof arg === 'string') ? arg : (arg && arg['dados.json']);
          if (dados == null) return Promise.reject(Object.assign(new Error('nada a gravar'), {code:'not_declared'}));
          try { localStorage.setItem(CHAVE, dados); return Promise.resolve(); }
          catch (e) { return Promise.reject(Object.assign(new Error('navegador recusou guardar'), {code:'rate_limited'})); }
        }
      });
    }
  };
})();
