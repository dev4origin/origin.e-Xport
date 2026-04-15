var App = new function () {
    var _baseURL = "";
   
    return {
        BaseURL: function (url) {
            _baseURL = url;
        },
        //Liste des Produits
        fpbChargerComboProduits: function (Id, params, ligneVide, bindValue) {
            $("#" + Id).empty();
            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + '/Produit/getProduitJson',
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Prdt_Id + "'>" + result.LibelleProduit + "</option>");
                    });
                    if (bindValue != null) { $("#" + Id).val(bindValue); }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            });
        },
        //Liste des Sites
        fpbChargerComboSites: function (Id, params, ligneVide, mode) {
            $("#" + Id).empty();
            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + '/Site/GetSiteJson',
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    if (mode == 1)
                        $.each(data, function (index, result) {
                            $("#" + Id).append("<option value='" + result.IDSite + "'>" + result.IDSite + "</option>");
                        });
                    else
                        $.each(data, function (index, result) {
                            $("#" + Id).append("<option value='" + result.IDSite + "'>" + result.IDSite + " - " + result.NomCourt + "</option>");
                        });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            });
        },

        //Liste des Ponts
        fpbChargerComboPonts: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + '/Pont/GetPontJson',
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.CodePont + "'>" + result.LibellePont + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            });
        },

        //Liste des Semaines
        fpbChargerComboSemaines: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/CampagneSemaine/GetCampagneSemaineJson",
                data: { Camp_Id: params.Camp_Id, Prdt_Id: params.Prdt_Id },
                success: function (data) {
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.SemaineNumero + "'>" + result.LibelleSemaine + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Exportateurs
        fpbChargerComboExportateurs: function (Id, params, ligneVide, bindValue) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            if (_params.type == null) _params.type = 1

            $.ajax({
                type: "GET",
                dataType: 'json',
                url: _baseURL + "/Exportateur/GetExportateurJson",
                data: { Exp_Id: _params.Exp_Id, type: _params.type },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Exp_Id + "'>" + result.NomCourt + "</option>");
                    });
                    if (bindValue != null) { $("#" + Id).val(bindValue); }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Exportateurs
        fpbChargerComboListeBroyeurs: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: 'json',
                url: _baseURL + "/Exportateur/GetExportateurListeJson",
                data: { Camp_Id: params.Camp_Id, Prdt_Id: params.Prdt_Id, Exp_Id: params.Exp_Id, Option: 'Broyeurs', Search: '' },
                success: function (data) {
                    if (ligneVide == true && params.Exp_Id=='')
                        $("#" + Id).append("<option value=''></option>");

                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Exp_Id + "'>" + result.NomCourt + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },
        fpbChargerComboListeBroyeursCession: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: 'json',
                url: _baseURL + "/Exportateur/GetExportateurListeJson",
                data: { Camp_Id: params.Camp_Id, Prdt_Id: params.Prdt_Id, Exp_Id: params.Exp_Id, Option: 'BroyeursCession', Search: params.Search },
                async: false,
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Exp_Id + "'>" + result.NomCourt + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },
        //Liste des Exportateurs
        fpbChargerComboListeExpFeves: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: 'json',
                url: _baseURL + "/Exportateur/GetExportateurListeJson",
                data: { Camp_Id: params.Camp_Id, Prdt_Id: params.Prdt_Id, Exp_Id: params.Exp_Id, Option: 'Feves', Search: '' },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Exp_Id + "'>" + result.NomCourt + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Exportateurs
        fpbChargerComboListeExpAll: function (Id, params, ligneVide, bindValue) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: 'json',
                url: _baseURL + "/Exportateur/GetExportateurListeJson",
                data: { Camp_Id: params.Camp_Id, Prdt_Id: params.Prdt_Id, Exp_Id: params.Exp_Id, Option: 'Tous', Search: '' },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Exp_Id + "'>" + result.NomCourt + "</option>");
                    });
                    if (bindValue != null) { $("#" + Id).val(bindValue); }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Magasins
        fpbChargerComboMagasins: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Magasin/getMagasinJson",
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.CodeMagasin + "'>" + result.NomMagasin + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Produits dérivés
        fpbChargerComboProduitDerives: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/ProduitDerive/GetProduitLotJson",
                data: { Prdt_Id: params.Prdt_Id, Camp_Id: params.Camp_Id, Exp_Id: params.Exp_Id, TypeExport: params.TypeExport },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.SingleProduitDerive_Id + "'>" + result.LibelleProduitDerive + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Produits dérivés BD SAIGIC
        fpbChargerComboProduitDerivesSaigic: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/ProduitDerive/GetProduitDeriveSaigicJson",
                data: { Prdt_Id: params.Prdt_Id, Qualite_Id: params.Qualite_Id, Option: params.Option },
                async: false,
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.ProduitDerive_Id + "'>" + result.LibelleProduitDerive + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Valeurs Oui/Non
        fpbChargerComboOuiNon: function(Id, params, ligneVide)
        {
            if (ligneVide == true)
                $("#" + Id).append("<option value='-1'></option>");

            $("#" + Id).append("<option value='1'>Oui</option>");
            $("#" + Id).append("<option value='0'>Non</option>");
        },

        //Liste des Formules Exportateur
        fpbChargerComboFormules: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Formule/GetFormule",
                data: { Camp_Id: params.Camp_Id, Exp_Id: params.Exp_Id, Prdt_Id: params.Prdt_Id, Recolte: params.Recolte, Parite: params.Parite, Option: params.Option },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.FO1_INFO + "'>" + result.NUM_FRC + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Types de Mouvmements
        fpbChargerComboTypeMouvement: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/TypeMouvement/GetTypeMouvementJson",
                data: { Option: params.Option },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.TypeMvt_Id + "'>" + result.LibelleTypeMvt + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Récoltes
        fpbChargerComboRecoltes: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Recolte/GetRecolte",
                data: { Option: params.Option, Camp_Id: params.Camp_Id, Recolte: params.Recolte, Exp_Id: params.Exp_Id, Prdt_Id: params.Prdt_Id },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.RCLT_LIB + "'>" + result.RCLT_LIB + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des RécoltesParité
        fpbChargerComboRecoltesParites: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Recolte/GetRecolteParite",
                data: { Option: _params.Option, Camp_Id: _params.Camp_Id, Recolte: _params.Recolte, Exp_Id: _params.Exp_Id, Prdt_Id: _params.Prdt_Id },
                async: false,
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Id_Traite + "'>" + result.RCLT_LIB + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Traites
        fpbChargerComboTraites: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Recolte/GetTraite",
                data: { Option: params.Option, Camp_Id: params.Camp_Id, Recolte: params.Recolte, Exp_Id: params.Exp_Id, Prdt_Id: params.Prdt_Id },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.LibelleTraite + "'>" + result.Intitule + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Fournisseurs
        fpbChargerComboFournisseurs: function (Id, params, ligneVide, bindValue) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Fournisseur/GetFournisseurListeJson",
                data: { Search: params.Search, Option: params.Option },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        //$("#" + Id).append("<option value='" + result.Fournisseur_Id + "'>" + result.Fournisseur_Id + "</option>");
                        $("#" + Id).append("<option value='" + result.Fournisseur_Id + "'>" + (params.DisplayMode == 'AvecNom' ? result.NomCourt : result.Fournisseur_Id) + "</option>");
                    });
                    if (bindValue != null) { $("#" + Id).val(bindValue); }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Departements
        fpbChargerComboDepartements: function (Id, params, ligneVide, bindValue) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Departement/GetDepartementJson",
                data: {},
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.Dept_Id + "'>" + result.LibelDepart + "</option>");
                    });
                    if (bindValue != null) { $("#" + Id).val(bindValue); }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Concessionnaires
        fpbChargerComboConcessionnaires: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Concessionnaire/GetConcessionnaireJson",
                data: { vppIdCCQ: _params.vppIdCCQ },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.IDControleur + "'>" + result.NomCourt + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Etats
        fpbChargerComboListeDesEtats: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/ListeEtat/GetListeEtatJson",
                data: { vppPrdt: params.vppPrdt, vppGroupe: params.vppGroupe },
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.IDWithCodeEtat + "'>" + result.LibelleEtat + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Liste des Sites
        fpbChargerComboPorts: function (Id, params, ligneVide, mode) {
            $("#" + Id).empty();
            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + '/Port/GetPortJson',
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");

                    if (mode == 1)
                        $.each(data, function (index, result) {
                            $("#" + Id).append("<option value='" + result.IDPort + "'>" + result.LibellePort + "</option>");
                        });
                    else
                        $.each(data, function (index, result) {
                            $("#" + Id).append("<option value='" + result.CodePort + "'>" + result.LibellePort + "</option>");
                        });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            });
        },

        //Liste des Emballages
        fpbChargerComboEmballages: function (Id, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Emballage/GetEmballageJson",
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.IDEmballage + "'>" + result.LibelleEmballage + "</option>");
                    });
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //alert('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },

        //Stock Tv Exportateur
        fpbChargerStockTv: function (Id, camp, exp, prdt, qlte, rclte) {
            $("#" + Id).empty();
            $.ajax({
                type: "GET",
                dataType: 'json',
                url:_baseURL + "/Pesee/StockExportateur", 
                data: { Camp_Id: camp, Recolte: rclte, Prdt_Id: prdt, Traite: 0, Exp_Id: exp, Parite: 0, Semaine: 0 },
                success: function (data) {
                    $("#" + Id).html(data.Html);
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    console.log('Erreur chargement stock achats ' + xhr.responseText);
                }
            })
        },
        //Stock Qualité Exportateur
        fpbChargerStockQlteExportateur: function (Id, camp, exp, prdt, qlte, rclte, parite, traite, semaine) {
            $("#" + Id).empty();
            $.ajax({
                type: "GET",
                dataType: 'json',
                url: _baseURL + "/MouvementStock/getStockQualiteExportateur",
                data: { Camp_Id: camp, Exp_Id: exp, Prdt_Id: prdt, PrdtDerive_Id: qlte, Recolte: rclte, Traite: 0, Parite: 0, Semaine: 0 },
                async: false,
                success: function (data) {
                    $("#" + Id).html(data.Html);
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    console.log('Erreur chargement stock Exportateur ' + xhr.responseText);
                }
            });
        },
        //Charger Liste valeurs
        fpbChargerListeValeurs: function (Id, arrayListe, params, ligneVide) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            if (ligneVide == true)
                $("#" + Id).append("<option value=''></option>");

            $.each(arrayListe, function (index, result) {
                $("#" + Id).append("<option value='" + result.key + "'>" + result.value + "</option>");
            });
        },
        //Liste des Inventaires
        fpbChargerComboInventaires: function (Id, params, ligneVide,bindValue) {
            $("#" + Id).empty();
            var _params = {};
            if (params != undefined && params != null)
                _params = params;

            $.ajax({
                type: "GET",
                dataType: "json",
                url: _baseURL + "/Inventaire/GetInventaireJson",
                data: { prdt: _params.prdt },
                async:false,
                success: function (data) {
                    if (ligneVide == true)
                        $("#" + Id).append("<option value=''></option>");
                    $.each(data, function (index, result) {
                        $("#" + Id).append("<option value='" + result.IdInventaire + "'>" + result.LibelleInventaire + "</option>");
                    });
                    if (bindValue != null) { $("#" + Id).val(bindValue); }
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    console.log('Erreur de chargement des données ' + xhr.responseText);
                }
            })
        },
        //Créer Select2Combo
        fpbSelect2Combo: function (element, options) {
            $(element).select2({
                ajax: {
                    url: options.url,
                    dataType: 'json',
                    type: 'GET',
                    delay: 250,
                    data: function (params) {
                        params.page = params.page || 1;
                        return {
                            searchTerm: params.term || '',
                            pageSize: 30,
                            pageNumber: params.page
                        };
                    },
                    processResults: function (data, params) {
                        params.page = params.page || 1;
                        return {
                            results: $.map(data.Results, function (data) {
                                return {
                                    text: data[options.items.text],
                                    id: data[options.items.id]
                                }
                            }),
                            pagination: {
                                more: (params.page * 30) < data.Total
                            }
                        };
                    },
                    cache: true
                },
                placeholder: options.placeholder || 'Rechercher un élément',
                escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
                minimumInputLength: 2
            });
        },
    }
};

$(function () {

    $("#DateDebut").datepicker({
        dateFormat: 'dd/mm/yy',
        defaultDate: "+1w",
        changeMonth: true,
        changeYear: true,
        onClose: function (selectedDate) {
            $("#DateFin").datepicker("option", "minDate", selectedDate);
        }
    });

    $("#DateFin").datepicker({
        dateFormat: 'dd/mm/yy',
        defaultDate: "+1w",
        changeMonth: true,
        changeYear: true,
        onClose: function (selectedDate) {
            $("#DateDebut").datepicker("option", "maxDate", selectedDate);
        }
    });

    $("#optPeriode").click(function () {
        if ($(this).is(':checked')) {
            $("#DateDebut").val(""); $("#DateDebut").prop('disabled', false);
            $("#DateFin").val(""); $("#DateFin").prop('disabled', false);
        }
        else {
            $("#DateDebut").val(""); $("#DateDebut").prop('disabled', true);
            $("#DateFin").val(""); $("#DateFin").prop('disabled', true);
        }
    });

    $(document).on('keydown', '.nbre1', function (event) {
        if (event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9
                    || event.keyCode == 27 || event.keyCode == 13
                    || (event.keyCode == 65 && event.ctrlKey === true)
                    || (event.keyCode >= 35 && event.keyCode <= 39)) {
            return;
        } else {
            // If it's not a number stop the keypress
            if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105)) {
                event.preventDefault();
            }
        }
    });

    $(".select2").select2({
        allowClear: true,
        placeholder: 'Choisir un élément',
    });

});

function loadSelect2(element, options) {
    $(element).select2({
        ajax: {
            url: options.url,
            dataType: 'json',
            type: 'GET',
            delay: 250,
            data: function (params) {
                params.page = params.page || 1;
                return {
                    searchTerm: params.term || '',
                    pageSize: 30,
                    pageNumber: params.page
                };
            },
            processResults: function (data, params) {
                params.page = params.page || 1;
                return {
                    results: $.map(data.Results, function (data) {
                        return {
                            text: data[options.items.text],
                            id: data[options.items.id]
                        }
                    }),
                    pagination: {
                        more: (params.page * 30) < data.Total
                    }
                };
            },
            cache: true
        },
        placeholder: options.placeholder || 'Rechercher un élément',
        escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
        minimumInputLength: 2
    });
}

function chargerRapport(params) {
    if (params != null) {
        var q = '?Report_Id=' + params.id;
        window.open('/Rapport/AfficherEtat2' + q, '_blank', 'fullscreen=yes, scrollbars=auto,title=Saigic - Report');
    } else {
        window.open('/Rapport/AfficherEtat2', '_blank', 'fullscreen=yes, scrollbars=auto,title=Saigic - Report');
    }
}
function validateForm() {
    // error handling
    var errorCounter = 0;
    $(".required").each(function (i, obj) {
        if ($(this).val() === '' || $(this).val() === null) {
            $(this).parent().addClass("has-error");
            errorCounter++;
        } else {
            $(this).parent().removeClass("has-error");
        }
    });
    return errorCounter;
}
function validateForm2(containerId) {
    var errorCounter = 0;
    var $container = containerId ? $("#" + containerId) : $(".required").parent();
    $container.find(".required").each(function () {
        $(this).parent().toggleClass("has-error", $(this).val() === '' || $(this).val() === null);
        errorCounter += $(this).val() === '' || $(this).val() === null ? 1 : 0;
    });
    return errorCounter;
}
function isUnique(tableSelector, colname) {
    // Collect all values in an array input[name^='Cpartie_']").
    var values = [];
    $("#" + tableSelector + " input[name^='" + colname + "']").each(function (idx, val) { values.push($(val).val()); });

    // Sort it
    values.sort();

    // Check whether there are two equal values next to each other
    for (var k = 1; k < values.length; ++k) {
        if (values[k] == values[k - 1]) return false;
    }
    return true;
}
function validateNumber(event) {
    var key = window.event ? event.keyCode : event.which;
    if (event.keyCode == 8 || event.keyCode == 46 || event.keyCode == 37 || event.keyCode == 39 || event.keyCode == 36 || event.keyCode == 35 || key == 43 || key == 44 || key == 45 || key == 46) {
        return true;
    }
    else if (key < 48 || key > 57) {
        return false;
    }
    else return true;
};
function formatErrorMessage(jqXHR, exception) {
    //alert($(responseTitle).text() + "\n" + formatErrorMessage(xhr, err) );
    if (jqXHR.status === 0) {
        return ("Not connected.\nPlease verify your network connection.");
    } else if (jqXHR.status == 404) {
        return ("The requested page not found. [404]");
    } else if (jqXHR.status == 500) {
        return ("Internal Server Error [500].");
    } else if (exception === "parsererror") {
        return ("Requested JSON parse failed.");
    } else if (exception === "timeout") {
        return ("Time out error.");
    } else if (exception === "abort") {
        return ("Ajax request aborted.");
    } else {
        return ("Uncaught Error.\n" + jqXHR.responseText);
    }
}

function convertDate(inputFormat) {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    var d = new Date(inputFormat);
    return [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()].join('/');
}
function formatNumber(toFormat) {
    //return n.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    return toFormat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

$.fn.serializeObject = function () {
    var disabled = this.find(':input:disabled').removeAttr('disabled');
    var formData = this.serializeArray(), data = {};
    for (var i = 0, len = formData.length; i < len; i++) {
        data[formData[i].name] = formData[i].value;
    }
    disabled.attr('disabled', 'disabled');
    return data;

    //var o = {};
    //var a = this.serializeArray();
    //$.each(a, function () {
    //    if (o[this.name] !== undefined) {
    //        if (!o[this.name].push) {
    //            o[this.name] = [o[this.name]];
    //        }
    //        o[this.name].push(this.value || '');
    //    } else {
    //        o[this.name] = this.value || '';
    //    }
    //});
    //return o;
};

function dateRange(startDate, endDate) {
    var start = startDate.split('-');
    var end = endDate.split('-');
    var startYear = parseInt(start[0]);
    var endYear = parseInt(end[0]);
    var dates = [];

    for (var i = startYear; i <= endYear; i++) {
        var endMonth = i != endYear ? 11 : parseInt(end[1]) - 1;
        var startMon = i === startYear ? parseInt(start[1]) - 1 : 0;
        for (var j = startMon; j <= endMonth; j = j > 12 ? j % 12 || 11 : j + 1) {
            var month = j + 1;
            var displayMonth = month < 10 ? '0' + month : month;
            dates.push([i, displayMonth, '01'].join('-'));
        }
    }
    return dates;
}

