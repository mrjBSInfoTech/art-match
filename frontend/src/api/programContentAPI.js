import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/program-content",
  timeout: 10000,
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

const normalizeContent = (content) =>
  Object.fromEntries(
    Object.entries(content).map(([key, program]) => [
      key,
      {
        ...program,
        image: program.image?.startsWith("/uploads/")
          ? new URL(program.image, api.defaults.baseURL).href
          : program.image,
      },
    ]),
  );

const serializeContent = (content) =>
  Object.fromEntries(
    Object.entries(content)
      .filter(([key]) => key !== "_upload")
      .map(([key, program]) => {
      const { _upload, ...storedProgram } = program;
      let image = storedProgram.image;
      if (image) {
        try {
          const parsedImage = new URL(image);
          if (parsedImage.origin === new URL(api.defaults.baseURL).origin) {
            image = parsedImage.pathname;
          }
        } catch {
          // Keep relative or external image values for backend validation.
        }
      }
      return [key, { ...storedProgram, image }];
      }),
  );

function throwRequestError(error) {
  throw new Error(
    error.response?.data?.message || error.message || "Program content request failed.",
  );
}

export async function fetchProgramContent() {
  try {
    const response = await api.get("/");
    return normalizeContent(response.data);
  } catch (error) {
    throwRequestError(error);
  }
}

export async function saveProgramContent(content, password) {
  try {
    const { _upload } = content;
    const formData = new FormData();
    formData.append("content", JSON.stringify(serializeContent(content)));
    formData.append("password", password);
    if (_upload?.file) {
      formData.append("program", _upload.program);
      formData.append("image", _upload.file);
    }
    const response = await api.put("/", formData);
    return normalizeContent(response.data.content);
  } catch (error) {
    throwRequestError(error);
  }
}
