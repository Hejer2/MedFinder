import api from '../api/axios';

export const fetchDoctorAvailability = () => {
  return api.get(`/availability`).then(res => res.data);
};

export const createDoctorAvailability = (data: { date: string; startTime: string; endTime: string }) => {
  return api.post('/availability', data).then(res => res.data);
};

export const deleteDoctorAvailability = (id: string) => {
  return api.delete(`/availability/${id}`).then(res => res.data);
};
