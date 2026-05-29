import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Employee,
  OfferLetter,
  OfferTemplate,
  ExperienceLetter,
  LOR,
  ApiResponse,
  PaginatedResponse,
  CreateEmployeePayload,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('hr_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    let message = 'Something went wrong';
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        // Handle FastAPI validation error list
        message = data.detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join(', ');
      } else if (data.message) {
        message = data.message;
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

// ==================== Employee API ====================
export const employeeApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    status?: string;
  }): Promise<PaginatedResponse<Employee>> => {
    const response = await apiClient.get('/employees', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Employee>> => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  create: async (payload: CreateEmployeePayload): Promise<ApiResponse<Employee>> => {
    const response = await apiClient.post('/employees', payload);
    return response.data;
  },

  update: async (id: string, payload: Partial<CreateEmployeePayload>): Promise<ApiResponse<Employee>> => {
    const response = await apiClient.put(`/employees/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },
};

// ==================== Offer Letter API ====================
export const offerLetterApi = {
  getAll: async (): Promise<ApiResponse<OfferLetter[]>> => {
    const response = await apiClient.get('/offer-letters');
    return response.data;
  },

  generate: async (payload: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    templateId: string;
    date: string;
    startDate: string;
    endDate: string;
    salary?: string;
    responsibilities?: string;
  }): Promise<ApiResponse<OfferLetter>> => {
    const response = await apiClient.post('/generate-offer-letter', payload);
    return response.data;
  },

  send: async (
    letterId: string,
    payload: {
      employeeName: string;
      employeeEmail: string;
      salary: string;
      startDate: string;
      endDate: string;
      pdfFilename: string;
      pptxFilename: string;
      emailSubject?: string;
      emailBody?: string;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/offer-letters/${letterId}/send`, payload);
    return response.data;
  },

  download: (letterId: string, filename: string): string => {
    return `${BASE_URL}/offer-letters/${letterId}/download?filename=${encodeURIComponent(filename)}`;
  },
};

// ==================== Template API ====================
export const templateApi = {
  getAll: async (): Promise<ApiResponse<OfferTemplate[]>> => {
    const response = await apiClient.get('/templates');
    return response.data;
  },

  create: async (payload: {
    name: string;
    roleTitle: string;
    responsibilities: string;
    salary?: string;
    duration?: string;
    emailSubject?: string;
    emailBody?: string;
    isDefault?: boolean;
  }): Promise<ApiResponse<OfferTemplate>> => {
    const response = await apiClient.post('/templates', payload);
    return response.data;
  },

  update: async (id: string, payload: Partial<{
    name: string;
    roleTitle: string;
    responsibilities: string;
    salary: string;
    duration: string;
    emailSubject: string;
    emailBody: string;
    isDefault: boolean;
  }>): Promise<ApiResponse<OfferTemplate>> => {
    const response = await apiClient.put(`/templates/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/templates/${id}`);
    return response.data;
  },
};

// ==================== Experience Letter API ====================
export const experienceLetterApi = {
  getAll: async (): Promise<ApiResponse<ExperienceLetter[]>> => {
    const response = await apiClient.get('/experience-letters');
    return response.data;
  },

  generate: async (payload: {
    employeeId: string;
    relievingDate: string;
  }): Promise<ApiResponse<ExperienceLetter>> => {
    const response = await apiClient.post('/generate-experience-letter', payload);
    return response.data;
  },

  send: async (letterId: string): Promise<ApiResponse<ExperienceLetter>> => {
    const response = await apiClient.post(`/experience-letters/${letterId}/send`);
    return response.data;
  },
};

// ==================== LOR API ====================
export const lorApi = {
  getAll: async (): Promise<ApiResponse<LOR[]>> => {
    const response = await apiClient.get('/lors');
    return response.data;
  },

  generate: async (payload: {
    employeeId: string;
    recipientName: string;
    recipientOrg: string;
    recommendation: string;
  }): Promise<ApiResponse<LOR>> => {
    const response = await apiClient.post('/generate-lor', payload);
    return response.data;
  },

  send: async (lorId: string): Promise<ApiResponse<LOR>> => {
    const response = await apiClient.post(`/lors/${lorId}/send`);
    return response.data;
  },
};

// ==================== Analytics API ====================
export const analyticsApi = {
  getSalaryTrends: async (year?: number) => {
    const response = await apiClient.get('/analytics/salary-trends', {
      params: { year },
    });
    return response.data;
  },

  getDepartmentStats: async () => {
    const response = await apiClient.get('/analytics/department-stats');
    return response.data;
  },

  getHiringTrends: async (year?: number) => {
    const response = await apiClient.get('/analytics/hiring-trends', {
      params: { year },
    });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await apiClient.get('/analytics/dashboard');
    return response.data;
  },
};

export default apiClient;
