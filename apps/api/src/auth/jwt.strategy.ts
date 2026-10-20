import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from './auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // fromUrlQueryParameter: los links de descarga de adjuntos son un
      // <a href> real (para que el navegador dispare la descarga nativa en
      // el mismo gesto del click, sin el fetch+blob async de antes que
      // hacía falta cliquear dos veces) — no pueden mandar el header
      // Authorization, así que ahí el token viaja como ?token=... (de
      // corta vida, ver AuthService.issueDownloadToken). El header sigue
      // siendo el método normal para el resto de la API.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
