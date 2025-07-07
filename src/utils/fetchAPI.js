export default async function fetchAPI(url, method = 'GET', bodyParam, options = {}) {
  let err, data;
  const arrayErrores = mensajes();
  let sessionParams = null;

  try {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // CONFIGURAR OBTENCION DE TOKEN DE SESION
    // if (url.includes('/private/')) {
    //   const rawToken = sessionStorage.getItem('authToken');
    //   try {
    //     sessionParams = JSON.parse(rawToken);
    //     if (sessionParams && sessionParams.token) {
    //       headers.Authorization = `Bearer ${sessionParams.token}`;
    //     } else {
    //       console.error("Token no encontrado para endpoint privado.");
    //     }
    //   } catch (e) {
    //     console.error("Error al parsear authToken.");
    //   }
    // }

    const body = bodyParam ? JSON.stringify(bodyParam) : null;

    const res = await fetch(url, {
      method,
      headers,
      body,
      ...options
    });

    data = await res.json();

    if (res.status < 200 || res.status >= 300) {
      if (
        res.status === 403 &&
        sessionParams?.token &&
        !url.includes(endpoints.JWTRefresh)
      ) {
        const tokenData = await fetchAPI(endpoints.JWTRefresh, 'POST');
        const newData = await fetchAPI(url, method, bodyParam);
        newData.newToken = tokenData.token;
        newData.newTokenRefresh = tokenData.tokenRefresh;
        return newData;
      }

      err = new Error(
        data.message === null
          ? `Unexpected Error (${url})`
          : data.message.replace(/<br>/g, '. ').replace(/<br\/>/g, '. ')
      );
      err.res = res;
      err.status = res.status;
      err.code = data.status === null ? res.status : data.status;
    }
  } catch (error) {
    if (error.code === -100) {
      err = new Error('Su sesión ha expirado');
      err.code = 'expired_session';
      err.res = null;
      err.status = null;
    } else {
      let mensajeError = '';
      if (error.message) {
        arrayErrores.forEach(element => {
          if (
            error.message.includes(element.message) ||
            error.message === element.message
          ) {
            mensajeError = element.mensaje;
          }
        });
      } else {
        mensajeError = arrayErrores[0].mensaje;
      }
      err = new Error(mensajeError === '' ? error.message : mensajeError);
      err.code = 'network_error';
      err.res = null;
      err.status = null;
    }
  }

  if (!err) {
    return data;
  }

  throw err;
}

//* ****** MENSAJES DE ERROR
const mensajes = () => {
  return [
    {
      message: 'Network request failed',
      mensaje: 'Error de la red, por favor verifique la conexión'
    },
    {
      message: 'Unexpected token',
      mensaje: 'Se produjo un error al realizar la operación'
    },
    {
      message: 'Unrecognized token',
      mensaje: 'Se produjo un error al realizar la operación, verifique la conexión'
    },
    {
      message: 'JSON parse error',
      mensaje: 'Se produjo un error al realizar la operación, verifique la conexión'
    },
    {
      message: 'Unexpected end of JSON input',
      mensaje: 'Error de la red, por favor verifique la conexión'
    },
    {
      message: 'Failed to fetch',
      mensaje: 'Error de la red, por favor verifique la conexión'
    },
    {
      message: 'fetch failed',
      mensaje: 'Error de la red, por favor verifique la conexión o el dominio'
    }
  ];
};
