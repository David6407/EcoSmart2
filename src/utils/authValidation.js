const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values) {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = 'El correo es obligatorio.';
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = 'Ingresa un correo valido.';
  }

  if (!values.password.trim()) {
    errors.password = 'La contrasena es obligatoria.';
  }

  return errors;
}

export function validateRegister(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'El nombre es obligatorio.';
  }

  if (!values.email.trim()) {
    errors.email = 'El correo es obligatorio.';
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = 'Ingresa un correo valido.';
  }

  if (!values.password.trim()) {
    errors.password = 'La contrasena es obligatoria.';
  } else if (values.password.length < 6) {
    errors.password = 'La contrasena debe tener al menos 6 caracteres.';
  }

  if (!values.confirmPassword.trim()) {
    errors.confirmPassword = 'Debes confirmar la contrasena.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Las contrasenas no coinciden.';
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
