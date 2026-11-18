import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/**
 * What an agent asks before it acts. All fields are required.
 * Decorators run bottom to top, and only the first failure per field is reported, so the most
 * basic check (is it there?) sits at the bottom.
 */
export class DecisionRequestDto {
  /** The agent harness, e.g. "claude-code". */
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  agent: string;

  /** The developer the agent works for, e.g. "dana@acme.dev". */
  @MaxLength(200)
  @IsString()
  @IsNotEmpty()
  user: string;

  /** The repository or project, e.g. "payments-api". */
  @MaxLength(200)
  @IsString()
  @IsNotEmpty()
  workspace: string;

  /** The program that will make the request, e.g. "curl" or "/usr/bin/git". */
  @MaxLength(200)
  @IsString()
  @IsNotEmpty()
  program: string;

  /** The HTTP method, e.g. "GET" or "POST". */
  @Matches(/^[A-Za-z]{1,16}$/, { message: 'method must be an HTTP method, e.g. GET or POST' })
  method: string;

  /** The full URL. Only its scheme, host and port are stored. */
  @MaxLength(4096)
  @IsString()
  @IsNotEmpty()
  url: string;
}
