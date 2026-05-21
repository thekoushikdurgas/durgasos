/**
 * react-motion@0.5.2 lifecycle patch for React 19 Strict Mode.
 * - Replaces legacy receive-props with componentDidUpdate
 * - Guards componentDidUpdate so internal setState (RAF) does not re-trigger prop handling
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const libDir = path.join(root, 'node_modules', 'react-motion', 'lib');
const buildDir = path.join(root, 'node_modules', 'react-motion', 'build');

const PATCHES = [
  {
    file: 'Motion.js',
    find: /  Motion\.prototype\.componentDidUpdate = function componentDidUpdate\(prevProps\) \{[\s\S]*?  \};\n\n  Motion\.prototype\.componentWillUnmount/,
    replace: `  Motion.prototype.componentDidUpdate = function componentDidUpdate(prevProps) {
    if (prevProps.style === this.props.style && prevProps.defaultStyle === this.props.defaultStyle) {
      return;
    }
    var props = this.props;
    if (this.unreadPropStyle != null) {
      this.clearUnreadPropStyle(this.unreadPropStyle);
    }

    this.unreadPropStyle = props.style;
    if (this.animationID == null) {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    }
  };

  Motion.prototype.componentWillUnmount`,
  },
  {
    file: 'StaggeredMotion.js',
    find: /  StaggeredMotion\.prototype\.componentDidUpdate = function componentDidUpdate\(prevProps\) \{[\s\S]*?  \};\n\n  StaggeredMotion\.prototype\.componentWillUnmount/,
    replace: `  StaggeredMotion.prototype.componentDidUpdate = function componentDidUpdate(prevProps) {
    if (prevProps.styles === this.props.styles && prevProps.defaultStyles === this.props.defaultStyles) {
      return;
    }
    var props = this.props;
    if (this.unreadPropStyles != null) {
      this.clearUnreadPropStyle(this.unreadPropStyles);
    }

    this.unreadPropStyles = props.styles(this.state.lastIdealStyles);
    if (this.animationID == null) {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    }
  };

  StaggeredMotion.prototype.componentWillUnmount`,
  },
  {
    file: 'TransitionMotion.js',
    find: /  TransitionMotion\.prototype\.componentDidUpdate = function componentDidUpdate\(prevProps\) \{[\s\S]*?  \};\n\n  TransitionMotion\.prototype\.componentWillUnmount/,
    replace: `  TransitionMotion.prototype.componentDidUpdate = function componentDidUpdate(prevProps) {
    if (
      prevProps.styles === this.props.styles &&
      prevProps.defaultStyles === this.props.defaultStyles &&
      prevProps.willEnter === this.props.willEnter &&
      prevProps.willLeave === this.props.willLeave &&
      prevProps.didLeave === this.props.didLeave
    ) {
      return;
    }
    var props = this.props;
    if (this.unreadPropStyles) {
      this.clearUnreadPropStyle(this.unreadPropStyles);
    }

    var styles = props.styles;
    if (typeof styles === 'function') {
      this.unreadPropStyles = styles(rehydrateStyles(this.state.mergedPropsStyles, this.unreadPropStyles, this.state.lastIdealStyles));
    } else {
      this.unreadPropStyles = styles;
    }

    if (this.animationID == null) {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    }
  };

  TransitionMotion.prototype.componentWillUnmount`,
  },
];

const LEGACY_UNSAFE =
  /\.UNSAFE_componentWillReceiveProps\s*=\s*function\s+UNSAFE_componentWillReceiveProps/g;

if (!fs.existsSync(libDir)) {
  console.warn('[patch-react-motion] react-motion not installed; skip');
  process.exit(0);
}

// Prebuilt UMD still ships legacy lifecycles; remove so bundlers cannot pick it up.
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}

let patched = 0;

for (const { file, find, replace } of PATCHES) {
  const filePath = path.join(libDir, file);
  if (!fs.existsSync(filePath)) continue;
  let src = fs.readFileSync(filePath, 'utf8');

  if (find.test(src)) {
    src = src.replace(find, replace);
    fs.writeFileSync(filePath, src);
    patched += 1;
    continue;
  }

  if (LEGACY_UNSAFE.test(src)) {
    src = src.replace(
      LEGACY_UNSAFE,
      '.UNSAFE_componentWillReceiveProps = function UNSAFE_componentWillReceiveProps'
    );
    fs.writeFileSync(filePath, src);
    console.warn(
      `[patch-react-motion] ${file} still has legacy lifecycle; re-run after npm install`
    );
  }
}

console.log(
  `[patch-react-motion] Guarded componentDidUpdate in ${patched} file(s); removed build/`
);
