import autoprefixer from 'gulp-autoprefixer';
import rename from 'gulp-rename';
import { src, dest, watch, series, parallel } from 'gulp';
import yargs from 'yargs';
import sass from 'gulp-sass';
import cleanCss from 'gulp-clean-css';
import gulpif from 'gulp-if';
import sourcemaps from 'gulp-sourcemaps';
import imagemin from 'gulp-imagemin';
import del from 'del';
import browserSync from 'browser-sync';
import zip from 'gulp-zip';
import info from './package.json';
import replace from 'gulp-replace';
import mmq from 'gulp-merge-media-queries';

const PRODUCTION = yargs.argv.prod;
const server = browserSync.create();
export const serve = done => {
  server.init({
    proxy: info.name + '.test',
    host: info.name + '.test',
    open: 'external',
    notify: false,
  });
  done();
};
export const reload = done => {
  server.reload();
  done();
};

export const clean = () => del(['dist']);

export const styles = () => {
  return src(['src/scss/vendor.scss'])
    .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
    .pipe(sass({ outputStyle: 'compact' }).on('error', sass.logError))
    .pipe(gulpif(PRODUCTION, mmq({ log: true })))
    .pipe(gulpif(PRODUCTION, cleanCss({ compatibility: 'ie8' })))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(
      autoprefixer({
        cascade: false,
      }),
    )
    .pipe(rename('main.css'))
    .pipe(dest('dist/css'))
    .pipe(server.stream());
};

export const images = () => {
  return src('src/images/**/*.{jpg,jpeg,png,svg,gif}')
    .pipe(
      gulpif(
        PRODUCTION,
        imagemin(
          [
            imagemin.svgo({
              plugins: [{ cleanupIDs: false }],
            }),
            imagemin.gifsicle({ optimizationLevel: 3 }),
            imagemin.mozjpeg(),
            imagemin.optipng({ optimizationLevel: 7 }),
          ],
          {
            verbose: true,
          },
        ),
      ),
    )
    .pipe(dest('dist/images'));
};

export const fonts = () => {
  return src('src/fonts/**/*').pipe(gulpif(PRODUCTION, imagemin())).pipe(dest('dist/fonts'));
};

export const copy = () => {
  return src(['src/**/*', '!src/{images,scss}', '!src/{images,scss}/**/*']).pipe(dest('dist'));
};

export const compress = () => {
  return src([
    '**/*',
    '!node_modules{,/**}',
    '!bundled{,/**}',
    '!src{,/**}',
    '!.babelrc',
    '!.gitignore',
    '!gulpfile.babel.js',
    '!package.json',
    '!package-lock.json',
  ])
    .pipe(gulpif(file => file.relative.split('.').pop() !== 'zip', replace('_themename', info.name)))
    .pipe(zip(`${info.name}.zip`))
    .pipe(dest('bundled'));
};

export const watchForChanges = () => {
  watch('src/scss/**/*.scss', series(styles, reload));
  watch('src/images/**/*.{jpg,jpeg,png,svg,gif}', series(images, reload));
  watch(['src/**/*', '!src/{images,scss}', '!src/{images,scss}/**/*'], series(copy, reload));
  watch('**/*.html', reload);
};

export const dev = series(clean, parallel(styles, fonts, images, copy), serve, watchForChanges);
export const build = series(clean, parallel(styles, fonts, images, copy), compress);
export default dev;
