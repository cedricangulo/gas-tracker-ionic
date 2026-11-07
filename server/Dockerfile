FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite headers

ENV APACHE_DOCUMENT_ROOT=/var/www/public
WORKDIR /var/www/app
COPY . /var/www/app
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/start.sh /usr/local/bin/start.sh

# Document root is an empty directory; only /api/ is exposed via Alias.
RUN mkdir -p /var/www/public && chmod +x /usr/local/bin/start.sh \
    && chown -R www-data:www-data /var/www/app

CMD ["start.sh"]
