import sha1 from 'sha1';
import dbClient from '../utils/db';

class BasicAuth {
  constructor(base64AuthorizationHeader) {
    this.base64AuthorizationHeader = base64AuthorizationHeader;
    this.decodedBase64AuthorizationHeader = null;
    this.userCredentials = [];
  }

  decodeBase64AuthorizationHeader() {
    if (!this.base64AuthorizationHeader) return null;
    if (!(typeof this.base64AuthorizationHeader === 'string')) return null;

    this.decodedBase64AuthorizationHeader = Buffer.from(
      this.base64AuthorizationHeader,
      'base64',
    ).toString('utf-8');

    return this.decodedBase64AuthorizationHeader;
  }

  extractUserCredentials() {
    if (!this.decodedBase64AuthorizationHeader) return null;
    if (!(typeof this.decodedBase64AuthorizationHeader === 'string')) return null;
    if (!this.decodedBase64AuthorizationHeader.includes(':')) return null;

    this.userCredentials = this.decodedBase64AuthorizationHeader.split(':', 2);
    return this.userCredentials;
  }

  async getUserFromCredentials() {
    if (!(this.userCredentials instanceof Array)) return null;
    if (this.userCredentials.length === 0) return null;

    const [email, password] = this.userCredentials;

    const user = await dbClient.users.findOne({ email });

    if (!user) return null;

    if (user.password !== sha1(password)) return null;

    return user;
  }

  async currentUser() {
    if (!this.decodeBase64AuthorizationHeader()) return null;

    if (!this.extractUserCredentials()) return null;

    const user = await this.getUserFromCredentials();

    if (!user) return null;

    return user;
  }
}

export default BasicAuth;
