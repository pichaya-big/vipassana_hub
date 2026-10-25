// Shows the server's message for one field. Renders nothing when there is no message.
export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="error-text" role="alert">
      {message}
    </p>
  ) : null;
}
