import type { Gimloader } from "../gimloader";
import wrench from '../../assets/wrench.svg';
import showModal from "./modal";
import PluginManagerUI from "./PluginManager";
import type PluginManager from "../pluginManager/pluginManager";

let modalOpen = false;

function openPluginManager(pluginManager: PluginManager) {
    if(modalOpen) return;

    modalOpen = true;
    showModal(GL.React.createElement(PluginManagerUI, { pluginManager }), {
        title: 'Manage Plugins',
        style: "width: clamp(600px, 50%, 90%); height: 80%",
        closeOnBackgroundClick: true,
        buttons: [
            {
                text: "close",
                style: "primary"
            }
        ],
        onClosed: () => modalOpen = false
    })
}

export function addPluginButtons(loader: Gimloader, pluginManager: PluginManager) {
    // add a hotkey shift+p to open the plugin manager
    loader.hotkeys.add(new Set(['alt', 'p']), () => openPluginManager(pluginManager));

    GM.registerMenuCommand("Open Plugin Manager", () => openPluginManager(pluginManager));
    
    // add the button to the creative screen and the host screen
    loader.parcel.interceptRequire(null, exports => exports?.default?.toString?.().includes('.disable?"none":"all"'), exports => {
        loader.patcher.after(null, exports, "default", (_, __, res) => {
            if(res?.props?.className?.includes?.('light-shadow flex between')) {
                let nativeType = res.props.children[1].type.type;
                res.props.children[1].type.type = function() {
                    let res = nativeType.apply(this, arguments);

                    // make sure we haven't already added the button
                    if(res.props.children.some((c: any) => c?.props?.tooltip === 'Plugins')) return res;

                    let btnType = res.props.children[0].type;
                    res.props.children.splice(0, 0, loader.React.createElement(btnType, {
                        tooltip: 'Plugins',
                        children: loader.React.createElement('div', {
                            className: 'gl-wrench',
                            dangerouslySetInnerHTML: { __html: wrench }
                        }),
                        onClick: () => openPluginManager(pluginManager)
                    }))

                    return res;
                }
            }
            
            if(res?.props?.children?.props?.tooltip === 'Options') {
                res.props.className = 'gl-row';

                let newBtn = res.props.children.type({
                    tooltip: 'Plugins',
                    children: loader.React.createElement('div', {
                        className: 'gl-wrench',
                        dangerouslySetInnerHTML: { __html: wrench }
                    }),
                    onClick: () => openPluginManager(pluginManager)
                })

                res.props.children = [res.props.children, newBtn];
            }

            return res;
        })
    }, true)

    // add the wrench button to the join screen
    loader.parcel.interceptRequire(null, exports => exports?.default?.toString?.().includes('type:"secondary"'), exports => {
        loader.patcher.after(null, exports, 'default', (_, __, res) => {
            let newButton = loader.React.createElement('button', {
                className: 'openPlugins',
                dangerouslySetInnerHTML: { __html: wrench },
                onClick: () => openPluginManager(pluginManager)
            });

            return loader.React.createElement('div', { className: 'gl-join' }, [res, newButton])
        });
    }, true)

    // add the button to the home screen
    loader.parcel.interceptRequire(null, exports => exports?.SpaceContext, exports => {
        loader.patcher.before(null, exports, 'default', (_, args) => {
            let light = location.href.includes("/creative")
            
            if(args[0].children?.some?.((c: any) => c?.key === 'creative')) {
                let icon = loader.React.createElement('div', {
                    className: 'icon',
                    dangerouslySetInnerHTML: { __html: wrench }
                })
                let text = loader.React.createElement('div', {
                    className: "text"
                }, "Plugins")
                let newEl = loader.React.createElement('div', {
                    className: `gl-homeWrench ${light ? 'light' : ''}`,
                    onClick: () => openPluginManager(pluginManager)
                }, [icon, text])
    
                args[0].children.splice(0, 0, newEl);
            }
        })
    }, true)

    // add the button to the host screen before the game starts
    loader.parcel.interceptRequire(null, 
        // the } is there for a reason
    exports => exports?.default?.toString?.().includes('customHorizontalPadding}'),
    exports => {
        let nativeDefault = exports.default;

        loader.patcher.after(null, exports, 'default', (_, __, res) => {
            let btnContents = loader.React.createElement('div', {
                className: "gl-hostWrench"
            }, [
                loader.React.createElement('div', {
                    className: 'gl-wrench',
                    dangerouslySetInnerHTML: { __html: wrench }
                }),
                loader.React.createElement('div', {}, "Plugins")
            ])

            let newBtn = nativeDefault.apply(this, [{
                children: btnContents,
                onClick: () => openPluginManager(pluginManager),
                customColor: "#01579b",
                className: 'gl-hostWrenchBtn'
            }])

            let name = res?.props?.children?.props?.children?.[2]?.props?.children?.props?.children?.[1]
            if(name === 'Rewards') {
                res.props.children = [newBtn, res.props.children]
            }

            return res;
        })
    }, true)

    // add the button to 1d host screens
    loader.parcel.interceptRequire(null, 
    exports => exports?.default?.displayName?.includes?.('inject-with-gameOptions-gameValues-players-kit-ui'),
    exports => {
        loader.patcher.after(null, exports.default, 'render', (_, __, res) => {
            let nativeType = res.type;
            
            delete res.type;
            res.type = function() {
                let res = new nativeType(...arguments);
                
                let nativeRender = res.render;
                delete res.render;
                
                res.render = function() {
                    let res = nativeRender.apply(this, arguments);
                    
                    let newBtn = loader.React.createElement('button', {
                        className: 'gl-1dHostPluginBtn',
                        onClick: () => openPluginManager(pluginManager)
                    }, 'Plugins')
                    
                    res.props.children = [newBtn, res.props.children];
                    
                    return res;
                }
                
                return res;
            }
            
            return res
        })
    }, true)
    
    // add the button to the 1d host screen while in-game
    // we need to do this to intercept the stupid mobx wrapper which is a massive pain
    loader.parcel.interceptRequire(null, exports => exports?.__decorate, exports => {
        loader.patcher.before(null, exports, '__decorate', (_, args) => {
            if(args[1]?.toString?.()?.includes("Toggle Music")) {
                let nativeRender = args[1].prototype.render;
                args[1].prototype.render = function() {
                    let res = nativeRender.apply(this, args);
                    let children = res.props.children[2].props.children.props.children

                    let newEl = loader.React.createElement(children[1].type, {
                        icon: loader.React.createElement('div', {
                            className: 'gl-1dHostGameWrench',
                            dangerouslySetInnerHTML: { __html: wrench }
                        }),
                        onClick: () => openPluginManager(pluginManager),
                        tooltipMessage: "Plugins"
                    })
                    
                    children.splice(0, 0, newEl);
                    
                    return res;
                }
            }
        })
    }, true)

    // add the button to the 1d game screen
    loader.parcel.interceptRequire(null, exports => exports?.observer &&
    exports.Provider, exports => {
        // let nativeObserver = exports.observer;
        // delete exports.observer;

        // exports.observer = function() {
        loader.patcher.before(null, exports, 'observer', (_, args) => {
            if(args[0]?.toString?.().includes('"aria-label":"Menu"')) {
                let nativeArgs = args[0];
                args[0] = function() {
                    let res = nativeArgs.apply(this, arguments);

                    // for when we're still on the join screen
                    if(res?.props?.children?.props?.children?.props?.src === '/client/img/svgLogoWhite.svg') {
                        let props = res.props.children.props

                        props.children = [props.children, loader.React.createElement('div', {
                            className: 'gl-1dGameWrenchJoin',
                            style: { cursor: 'pointer' },
                            dangerouslySetInnerHTML: { __html: wrench },
                            onClick: () => openPluginManager(pluginManager)
                        })];

                        return res;
                    }
                    
                    let children = res?.props?.children?.[0]?.props?.children?.props?.children;
                    if(!children) return res;
                    
                    let newEl = loader.React.createElement(children[1].type, {
                        onClick: () => openPluginManager(pluginManager),
                    }, loader.React.createElement('div', {
                        className: 'gl-1dGameWrench',
                        dangerouslySetInnerHTML: { __html: wrench }
                    }))
                    
                    children.splice(3, 0, newEl)
                    
                    return res;
                }
            }
        })
    }, true);
}