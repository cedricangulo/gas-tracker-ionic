<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class AuthTokenTest extends TestCase
{
    /** @var array<string, mixed> */
    private array $server;

    protected function setUp(): void
    {
        $this->server = $_SERVER;
    }

    protected function tearDown(): void
    {
        $_SERVER = $this->server;
    }

    public function testBearerTokenIsReadFromAuthorizationHeader(): void
    {
        $token = rtrim(strtr(base64_encode(str_repeat('a', 32)), '+/', '-_'), '=');
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;

        self::assertSame($token, bearer_token());
    }

    public function testBearerTokenRejectsMissingOrMalformedAuthorizationHeader(): void
    {
        foreach (
            ['', 'Basic abc', 'Bearer too-short', 'Bearer ' . str_repeat('!', 43)]
            as $header
        ) {
            $_SERVER['HTTP_AUTHORIZATION'] = $header;
            self::assertSame('', bearer_token());
        }
    }
}
