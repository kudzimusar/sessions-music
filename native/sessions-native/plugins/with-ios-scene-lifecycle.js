const {withAppDelegate,withInfoPlist}=require('@expo/config-plugins');

const configurationMethod=`
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`;

const sceneDelegate=`
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let sceneWindow = UIWindow(windowScene: windowScene)
    window = sceneWindow
    appDelegate.window = sceneWindow
    factory.startReactNative(withModuleName: "main", in: sceneWindow, launchOptions: nil)

    if !connectionOptions.urlContexts.isEmpty {
      self.scene(scene, openURLContexts: connectionOptions.urlContexts)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let context = URLContexts.first,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
    if let sourceApplication = context.options.sourceApplication { options[.sourceApplication] = sourceApplication }
    if let annotation = context.options.annotation { options[.annotation] = annotation }
    _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
  }
}
`;

function patchDelegate(source){
  if(source.includes('class SceneDelegate: UIResponder, UIWindowSceneDelegate'))return source;

  const startup=/#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif/;
  if(!startup.test(source))throw new Error('Sessions iOS scene plugin could not find the Expo React Native startup block.');

  let next=source.replace(startup,`#if os(iOS) || os(tvOS)\n    if #unavailable(iOS 13.0) {\n      window = UIWindow(frame: UIScreen.main.bounds)\n      factory.startReactNative(\n        withModuleName: "main",\n        in: window,\n        launchOptions: launchOptions)\n    }\n#endif`);

  if(!next.includes('configurationForConnecting connectingSceneSession')){
    const marker='\n  // Linking API';
    if(!next.includes(marker))throw new Error('Sessions iOS scene plugin could not find the AppDelegate linking marker.');
    next=next.replace(marker,`${configurationMethod}\n  // Linking API`);
  }

  const delegateMarker='\nclass ReactNativeDelegate: ExpoReactNativeFactoryDelegate';
  if(!next.includes(delegateMarker))throw new Error('Sessions iOS scene plugin could not find ReactNativeDelegate.');
  return next.replace(delegateMarker,`${sceneDelegate}${delegateMarker}`);
}

module.exports=function withSessionsIosSceneLifecycle(config){
  config=withInfoPlist(config,next=>{
    next.modResults.UIApplicationSceneManifest={
      UIApplicationSupportsMultipleScenes:false,
      UISceneConfigurations:{
        UIWindowSceneSessionRoleApplication:[{
          UISceneConfigurationName:'Default Configuration',
          UISceneDelegateClassName:'$(PRODUCT_MODULE_NAME).SceneDelegate'
        }]
      }
    };
    return next;
  });

  return withAppDelegate(config,next=>{
    if(next.modResults.language!=='swift')throw new Error('Sessions iOS scene plugin requires a Swift AppDelegate.');
    next.modResults.contents=patchDelegate(next.modResults.contents);
    return next;
  });
};

module.exports.patchDelegate=patchDelegate;
