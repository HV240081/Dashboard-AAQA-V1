const API_URL = 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
  };
};

export const exportService = {
  async downloadSummaryPdf() {
    const response = await fetch(`${API_URL}/reports/summary/pdf`, {
      headers: getAuthHeaders(),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen_ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async downloadSummaryExcel() {
    const response = await fetch(`${API_URL}/reports/summary/excel`, {
      headers: getAuthHeaders(),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen_ejecutivo_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async downloadCategoryExcel(category: string, year?: number) {
    const url = year 
      ? `${API_URL}/reports/category/${category}/excel?year=${year}`
      : `${API_URL}/reports/category/${category}/excel`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlBlob;
    a.download = `categoria_${category}_${year || 'todas'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(urlBlob);
  },

  async downloadProjectPdf(projectId: string, projectName: string) {
    const response = await fetch(`${API_URL}/reports/project/${projectId}/pdf`, {
      headers: getAuthHeaders(),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyecto_${projectName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async downloadFormativeExcel() {
    const response = await fetch(`${API_URL}/reports/formative/excel`, {
      headers: getAuthHeaders(),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_formativo_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};