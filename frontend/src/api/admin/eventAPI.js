import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/event",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const handleError = (error) => {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }

  if (error.response?.data?.error) {
    throw new Error(error.response.data.error);
  }

  if (error.request) {
    throw new Error(
      "Server not responding. Please check your connection.",
    );
  }

  throw new Error(
    error.message || "Unable to process event request.",
  );
};

const createEventFormData = (eventData) => {
  const formData = new FormData();

  const fields = [
    "title",
    "description",
    "location",
    "start_at",
    "end_at",
    "status",
  ];

  fields.forEach((field) => {
    const value = eventData?.[field];

    if (
      value !== undefined &&
      value !== null
    ) {
      formData.append(field, value);
    }
  });

  if (eventData?.file) {
    formData.append(
      "image",
      eventData.file,
    );
  }

  return formData;
};

const normalizeEvent = (event) => ({
  ...event,
  image_url: event.image_url ? new URL(event.image_url, api.defaults.baseURL).href : null,
});

export const fetchEvents = async () => {
  try {
    const response = await api.get("/");
    return Array.isArray(response.data) ? response.data.map(normalizeEvent) : [];
  } catch (error) {
    handleError(error);
  }
};

export const fetchEventById = async (
  eventId,
) => {
  try {
    const response = await api.get(
      `/${eventId}`,
    );

    return normalizeEvent(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const addEvent = async (
  eventData,
) => {
  try {
    const formData =
      createEventFormData(eventData);

    const response = await api.post(
      "/",
      formData,
    );

    return normalizeEvent(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const updateEvent = async (
  eventId,
  eventData,
) => {
  try {
    const formData =
      createEventFormData(eventData);

    const response = await api.put(
      `/${eventId}`,
      formData,
    );

    return normalizeEvent(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const deleteEvent = async (
  eventId,
) => {
  try {
    const response = await api.delete(
      `/${eventId}`,
    );

    return response.data;
  } catch (error) {
    handleError(error);
  }
};
