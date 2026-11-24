import { useRef, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { loginSchema, type LoginFormData } from '../validators/authSchema';
import { useLogin } from '../hooks/useLogin';
import { DemoCredentialsBox } from './DemoCredentialsBox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageField, PageForm, PageText } from '@/components/ui/page';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import {
  extractApiErrorMessage,
  getApiErrorStatus,
  LOGIN_RATE_LIMIT_MESSAGE,
} from '@/lib/apiErrors';

const CREDENTIALS_MESSAGE = 'Credenciales de acceso incorrectas o cuenta inactiva. Verifica tus datos.';

export const LoginForm = () => {
  const { mutate: login, isPending, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  /**
   * Bloqueo síncrono del envío.
   *
   * `isPending` deshabilita el botón en el siguiente render, pero un doble clic
   * puede ejecutar dos veces el submit antes de que React repinte. Este ref se
   * activa en el primer clic y evita que el segundo dispare otra petición de
   * login (origen de los 429 por ráfaga).
   */
  const submittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit((data: LoginFormData) => {
      if (submittingRef.current || isPending) return;
      submittingRef.current = true;
      login(data, {
        onSettled: () => {
          submittingRef.current = false;
        },
      });
    })(event);
  };

  const handleSelectDemo = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <PageForm onSubmit={submitLogin}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorStatus(error) === 429
              ? LOGIN_RATE_LIMIT_MESSAGE
              : getApiErrorStatus(error) === 401
                ? CREDENTIALS_MESSAGE
                : extractApiErrorMessage(error, CREDENTIALS_MESSAGE)}
          </AlertDescription>
        </Alert>
      )}

      <PageField label="Correo Corporativo" htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          placeholder="admin@mype.pe"
          autoComplete="email"
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
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            className="pr-10"
            {...register('password')}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <PageText id="login-password-error" variant="error" role="alert">
            {errors.password.message}
          </PageText>
        )}
      </PageField>

      <Button type="submit" fullWidth disabled={isPending} aria-busy={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Iniciando Sesión...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4 mr-2" />
            Iniciar Sesión
          </>
        )}
      </Button>

      <div className="text-center pt-2">
        <Link
          to="/register"
          className="text-xs text-primary hover:underline font-medium focus:outline-none"
        >
          ¿Empresa nueva? Registra tu MYPE aquí
        </Link>
      </div>

      <DemoCredentialsBox onSelect={handleSelectDemo} />
    </PageForm>
  );
};
