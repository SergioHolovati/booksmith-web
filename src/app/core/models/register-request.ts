export class RegisterRequest {
  constructor(
    public firstName: string,
    public lastName: string,
    public username: string,
    public document: string,
    public email: string,
    public password: string,
    public phone: string
  ) {}
}
