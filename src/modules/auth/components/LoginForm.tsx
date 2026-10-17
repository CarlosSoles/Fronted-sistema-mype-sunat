import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validators/authSchema';
import { useLogin } from '../hooks/useLogin';
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  PageField,
  PageForm,
  PageText,
} from '@/components/ui';
import { LogIn } from 'lucide-react';

export const LoginForm = () => {
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <PageForm onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Credenciales incorrectas o servidor no disponible.
          </AlertDescription>
        </Alert>
      )}

      <PageField label="Correo Electrónico" htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          placeholder="contador@mype.pe"
          {...register('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
        />
        {errors.email && (
          <PageText id="login-email-error" variant="error" role="alert">
            {errors.email.message}
          </PageText>
        )}
      </PageField>

      <PageField label="Contraseña" htmlFor="login-password">
        <Input
          id="login-password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
        />
        {errors.password && (
          <PageText id="login-password-error" variant="error" role="alert">
            {errors.password.message}
          </PageText>
        )}
      </PageField>

      <Button type="submit" fullWidth disabled={isPending}>
        <LogIn aria-hidden="true" />
        Iniciar Sesión
      </Button>
    </PageForm>
  );
};
