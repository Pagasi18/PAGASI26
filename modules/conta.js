// Pagasi module: conta
PG.conta = function(){
  // Alias: Contabilidad ahora vive dentro de Finanzas (tab Proyecciones)
  S.reportesTab = 'proyecciones';
  // nav() llama a la página sin PG como this: con this.reportes() se caía al guardar un egreso (21-oct-2026)
  return PG.reportes();
};

